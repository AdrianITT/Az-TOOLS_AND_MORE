import { useEffect, useRef, useState } from 'react'
import { Camera, Check, Trash2, AlertTriangle } from 'lucide-react'
import { getErrorMessage } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { MasOpciones, InputMonto } from '../../components/ui/FormExtras'
import styles from '../shared-form.module.css'

const CONFIANZA = {
  alta: { label: 'Detección buena', color: '#27ae60' },
  media: { label: 'Revisá la fecha', color: '#e67e22' },
  baja: { label: 'No se pudo leer — completá a mano', color: '#e74c3c' },
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function EscanearRecibos({ open, onClose, tipoInicial = 'gasto', categoriaIngresos, categoriaGastos, onRegistrado }) {
  const [cards, setCards] = useState([])
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  // Liberar los object URLs de las miniaturas al cerrar
  useEffect(() => {
    if (open) return undefined
    return () => cards.forEach((c) => c.preview && URL.revokeObjectURL(c.preview))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function reset() {
    cards.forEach((c) => c.preview && URL.revokeObjectURL(c.preview))
    setCards([])
    setError('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function analizar(files) {
    if (!files.length) return
    setError('')
    setAnalizando(true)
    try {
      const form = new FormData()
      files.forEach((f) => form.append('imagenes', f))
      const token = localStorage.getItem('token')
      const res = await fetch('/api/finanzas/recibos/analizar/', {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: form,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw Object.assign(new Error('analizar'), { data })
      }
      setCards(
        data.map((r, i) => ({
          key: `${Date.now()}-${i}`,
          archivo: r.archivo,
          file: files[i],
          preview: URL.createObjectURL(files[i]),
          monto: r.monto ?? '',
          fecha: r.fecha ?? hoyISO(),
          descripcion: r.comercio ?? '',
          tipo: tipoInicial,
          categoria: '',
          textoCrudo: r.texto_crudo,
          confianza: r.confianza,
          estado: 'pendiente',
          errorCard: '',
        })),
      )
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron analizar las imágenes'))
    } finally {
      setAnalizando(false)
    }
  }

  function updateCard(key, cambios) {
    setCards((cs) => cs.map((c) => (c.key === key ? { ...c, ...cambios } : c)))
  }

  async function registrar(card) {
    updateCard(card.key, { estado: 'registrando', errorCard: '' })
    try {
      const endpoint = card.tipo === 'ingreso' ? '/api/finanzas/ingresos/' : '/api/finanzas/gastos/'
      // Multipart: el movimiento viaja junto con la foto como comprobante
      const form = new FormData()
      form.append('categoria', card.categoria)
      form.append('monto', card.monto)
      form.append('fecha', card.fecha)
      form.append('descripcion', card.descripcion || '')
      if (card.file) form.append('comprobante', card.file)
      const token = localStorage.getItem('token')
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: form,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw Object.assign(new Error('registrar'), { data })
      }
      updateCard(card.key, { estado: 'registrado' })
      onRegistrado?.()
    } catch (err) {
      updateCard(card.key, { estado: 'pendiente', errorCard: getErrorMessage(err, 'No se pudo registrar') })
    }
  }

  function descartar(key) {
    setCards((cs) => cs.filter((c) => c.key !== key))
  }

  const pendientes = cards.filter((c) => c.estado !== 'registrado').length

  return (
    <Modal open={open} title="Escanear recibos" onClose={handleClose} wide>
      <div>
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 12px' }}>
            <Camera size={40} color="#3498db" style={{ marginBottom: 10 }} />
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Subí o fotografiá tus recibos</p>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 18px' }}>
              Hasta 10 imágenes por tanda. Se detectan monto, fecha y comercio — vos revisás y confirmás cada uno.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => analizar(Array.from(e.target.files).slice(0, 10))}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={analizando}>
              <Camera size={16} style={{ marginRight: 8 }} />
              {analizando ? 'Analizando…' : 'Tomar foto / elegir imágenes'}
            </Button>
            {analizando && (
              <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>
                Leyendo los recibos… esto toma unos segundos por imagen.
              </p>
            )}
            {error && <p className={styles.error} style={{ marginTop: 12 }}>{error}</p>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, color: '#888', fontSize: 13 }}>
              {pendientes === 0
                ? '¡Todos los recibos quedaron registrados!'
                : `${cards.length} recibo(s) analizados — revisá cada uno, asigná la categoría y registralo.`}
            </p>

            {cards.map((card) => {
              const conf = CONFIANZA[card.confianza] ?? CONFIANZA.baja
              const categorias = card.tipo === 'ingreso' ? categoriaIngresos : categoriaGastos
              const registrado = card.estado === 'registrado'
              return (
                <div
                  key={card.key}
                  style={{
                    border: registrado ? '1.5px solid #27ae60' : '1px solid #ddd',
                    borderRadius: 10, padding: 14, opacity: registrado ? 0.75 : 1,
                    display: 'flex', gap: 14, flexWrap: 'wrap',
                  }}
                >
                  <img
                    src={card.preview}
                    alt={card.archivo}
                    style={{ width: 90, height: 120, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: conf.color }}>
                        {registrado ? '✓ Registrado' : conf.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#aaa' }}>{card.archivo}</span>
                    </div>

                    {!registrado && (
                      <>
                        <div className={styles.row}>
                          <Field label="Monto">
                            <InputMonto
                              value={card.monto}
                              onChange={(e) => updateCard(card.key, { monto: e.target.value })}
                              style={card.monto === '' ? { borderColor: '#e74c3c' } : undefined}
                            />
                          </Field>
                          <Field label="Fecha">
                            <Input
                              type="date"
                              value={card.fecha}
                              onChange={(e) => updateCard(card.key, { fecha: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className={styles.row}>
                          <Field label="Tipo">
                            <Select
                              value={card.tipo}
                              onChange={(e) => updateCard(card.key, { tipo: e.target.value, categoria: '' })}
                            >
                              <option value="gasto">Gasto</option>
                              <option value="ingreso">Ingreso</option>
                            </Select>
                          </Field>
                          <Field label="Categoría">
                            <Select
                              value={card.categoria}
                              onChange={(e) => updateCard(card.key, { categoria: e.target.value })}
                            >
                              <option value="">Seleccionar…</option>
                              {categorias.map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))}
                            </Select>
                          </Field>
                        </div>
                        <Field label="Descripción">
                          <Input
                            value={card.descripcion}
                            onChange={(e) => updateCard(card.key, { descripcion: e.target.value })}
                            placeholder="Comercio / concepto"
                          />
                        </Field>
                        <MasOpciones etiqueta="Ver texto detectado">
                          <pre style={{
                            fontSize: 11, color: '#666', background: 'rgba(0,0,0,0.04)',
                            padding: 10, borderRadius: 6, maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap',
                          }}>
                            {card.textoCrudo || '(sin texto detectado)'}
                          </pre>
                        </MasOpciones>
                        {card.errorCard && (
                          <p className={styles.error} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={14} /> {card.errorCard}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <Button
                            onClick={() => registrar(card)}
                            disabled={card.estado === 'registrando' || !card.monto || !card.categoria || !card.fecha}
                          >
                            <Check size={16} style={{ marginRight: 6 }} />
                            {card.estado === 'registrando' ? 'Registrando…' : `Registrar ${card.tipo}`}
                          </Button>
                          <Button variant="secondary" onClick={() => descartar(card.key)}>
                            <Trash2 size={16} style={{ marginRight: 6 }} /> Descartar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={reset}>
                <Camera size={16} style={{ marginRight: 6 }} /> Escanear otros
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
