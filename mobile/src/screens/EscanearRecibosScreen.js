import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { colors, confianza as CONFIANZA, radius, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import * as finanzas from '../api/finanzas'
import * as deudasApi from '../api/deudas'
import { analizarRecibos } from '../api/recibos'
import { hoyISO } from '../utils/format'
import { elegirDeGaleria, prepararFoto, tomarFoto } from '../utils/fotos'
import { Boton, Campo, Cargando, Entrada, EntradaFecha, EntradaMonto, Tarjeta } from '../components/ui'
import { CategoriaPicker } from '../components/CategoriaPicker'

/**
 * Flujo OCR (réplica móvil de frontend EscanearRecibos.jsx):
 * fotos → compresión → POST recibos/analizar/ → cards editables → registrar
 * cada una vía multipart con la foto como comprobante.
 *
 * route.params: { modo: 'movimiento' | 'deuda' }
 */
export function EscanearRecibosScreen({ navigation, route }) {
  const modo = route.params?.modo ?? 'movimiento'
  const esDeuda = modo === 'deuda'
  const [cards, setCards] = useState([])
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const catIngresos = useQuery({ queryKey: ['categorias', 'ingresos'], queryFn: () => finanzas.listarCategorias('ingresos'), enabled: !esDeuda })
  const catGastos = useQuery({ queryKey: ['categorias', 'gastos'], queryFn: () => finanzas.listarCategorias('gastos'), enabled: !esDeuda })
  const catDeudas = useQuery({ queryKey: ['categorias-deudas'], queryFn: deudasApi.listarCategoriasDeuda, enabled: esDeuda })

  function desenvolver(q) {
    return q.data?.results ?? q.data ?? []
  }

  async function analizar(obtenerAssets) {
    setError('')
    const assets = await obtenerAssets()
    if (!assets.length) return
    setAnalizando(true)
    try {
      const fotos = await Promise.all(assets.slice(0, 10).map(prepararFoto))
      const data = await analizarRecibos(fotos, modo)
      setCards(
        data.map((r, i) => ({
          key: `${Date.now()}-${i}`,
          archivo: r.archivo,
          foto: fotos[i],
          monto: r.monto != null ? String(r.monto) : '',
          fecha: r.fecha ?? hoyISO(),
          fechaVencimiento: r.fecha_vencimiento ?? '',
          descripcion: esDeuda ? '' : (r.comercio ?? ''),
          acreedor: r.comercio ?? '',
          tipo: esDeuda ? 'deuda' : 'gasto',
          categoria: null,
          textoCrudo: r.texto_crudo,
          confianza: r.confianza,
          estado: 'pendiente', // pendiente | registrando | registrado
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
      if (card.tipo === 'deuda') {
        await deudasApi.crearDeuda(
          {
            categoria: card.categoria,
            acreedor: card.acreedor,
            monto_original: card.monto,
            fecha_inicio: card.fecha,
            fecha_vencimiento: card.fechaVencimiento || undefined,
            notas: card.descripcion || undefined,
          },
          card.foto,
        )
        queryClient.invalidateQueries({ queryKey: ['deudas'] })
      } else {
        const tipoApi = card.tipo === 'ingreso' ? 'ingresos' : 'gastos'
        await finanzas.crearMovimiento(
          tipoApi,
          { categoria: card.categoria, monto: card.monto, fecha: card.fecha, descripcion: card.descripcion || '' },
          card.foto,
        )
        queryClient.invalidateQueries({ queryKey: ['movimientos', tipoApi] })
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      updateCard(card.key, { estado: 'registrado' })
    } catch (err) {
      updateCard(card.key, { estado: 'pendiente', errorCard: getErrorMessage(err, 'No se pudo registrar') })
    }
  }

  function puedeRegistrar(card) {
    if (!card.monto || !card.categoria || !card.fecha) return false
    if (card.tipo === 'deuda' && !card.acreedor) return false
    return true
  }

  function categoriasDe(card) {
    if (card.tipo === 'deuda') return desenvolver(catDeudas)
    return card.tipo === 'ingreso' ? desenvolver(catIngresos) : desenvolver(catGastos)
  }

  if (analizando) return <Cargando texto="Analizando en el servidor… esto toma unos segundos por imagen." />

  if (cards.length === 0) {
    return (
      <View style={styles.vacio}>
        <Text style={{ fontSize: 44 }}>📷</Text>
        <Text style={styles.vacioTitulo}>
          {esDeuda ? 'Fotografía tus facturas a crédito' : 'Fotografía tus recibos'}
        </Text>
        <Text style={styles.vacioTexto}>
          {esDeuda
            ? 'Se detectan monto, acreedor, emisión y vencimiento — tú revisas y confirmas.'
            : 'Hasta 10 imágenes por tanda. Se detectan monto, fecha y comercio — tú revisas y confirmas cada uno.'}
        </Text>
        {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md, textAlign: 'center' }}>{error}</Text> : null}
        <View style={{ gap: spacing.sm, width: '100%' }}>
          <Boton title="📷 Tomar foto" onPress={() => analizar(tomarFoto)} />
          <Boton
            title="🖼️ Elegir de la galería"
            variant="secondary"
            onPress={() => analizar(() => elegirDeGaleria({ multiple: true, max: 10 }))}
          />
        </View>
      </View>
    )
  }

  const pendientes = cards.filter((c) => c.estado !== 'registrado').length

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        {pendientes === 0 ? '¡Todo registrado!' : `${cards.length} imagen(es) analizadas — revisa cada una y regístrala.`}
      </Text>

      {cards.map((card) => {
        const conf = CONFIANZA[card.confianza] ?? CONFIANZA.baja
        const registrado = card.estado === 'registrado'
        return (
          <Tarjeta key={card.key} style={registrado ? { borderColor: colors.success, opacity: 0.7 } : null}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Image source={{ uri: card.foto.uri }} style={styles.miniatura} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: registrado ? colors.success : conf.color }}>
                  {registrado ? '✓ Registrado' : conf.label}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{card.archivo}</Text>
              </View>
              {!registrado && (
                <Pressable onPress={() => setCards((cs) => cs.filter((c) => c.key !== card.key))} hitSlop={10}>
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </Pressable>
              )}
            </View>

            {!registrado && (
              <View style={{ marginTop: spacing.md }}>
                <Campo label={card.tipo === 'deuda' ? 'Monto original' : 'Monto'}>
                  <EntradaMonto value={card.monto} onChangeText={(v) => updateCard(card.key, { monto: v })} />
                </Campo>
                <Campo label={card.tipo === 'deuda' ? 'Fecha de emisión' : 'Fecha'}>
                  <EntradaFecha value={card.fecha} onChange={(v) => updateCard(card.key, { fecha: v })} />
                </Campo>

                {card.tipo === 'deuda' && (
                  <>
                    <Campo label="Acreedor">
                      <Entrada
                        value={card.acreedor}
                        onChangeText={(v) => updateCard(card.key, { acreedor: v })}
                        placeholder="Proveedor, banco…"
                      />
                    </Campo>
                    <Campo
                      label="Fecha de vencimiento"
                      hint={card.fechaVencimiento ? 'Detectada del documento' : 'No detectada — opcional'}
                    >
                      <EntradaFecha
                        value={card.fechaVencimiento}
                        onChange={(v) => updateCard(card.key, { fechaVencimiento: v })}
                      />
                    </Campo>
                  </>
                )}

                {card.tipo !== 'deuda' && (
                  <Campo label="Tipo">
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      {['gasto', 'ingreso'].map((t) => (
                        <Pressable
                          key={t}
                          onPress={() => updateCard(card.key, { tipo: t, categoria: null })}
                          style={[styles.chipTipo, card.tipo === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        >
                          <Text style={{ color: card.tipo === t ? '#fff' : colors.text, fontSize: 13, fontWeight: '500' }}>
                            {t === 'gasto' ? '💸 Gasto' : '💰 Ingreso'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </Campo>
                )}

                <Campo label="Categoría">
                  <CategoriaPicker
                    categorias={categoriasDe(card)}
                    value={card.categoria}
                    onChange={(id) => updateCard(card.key, { categoria: id })}
                    conTipo={card.tipo === 'deuda'}
                    onCrear={(datos) =>
                      card.tipo === 'deuda'
                        ? deudasApi.crearCategoriaDeuda(datos)
                        : finanzas.crearCategoria(card.tipo === 'ingreso' ? 'ingresos' : 'gastos', datos)
                    }
                    queryKey={card.tipo === 'deuda' ? ['categorias-deudas'] : ['categorias', card.tipo === 'ingreso' ? 'ingresos' : 'gastos']}
                  />
                </Campo>

                <Campo label={card.tipo === 'deuda' ? 'Notas' : 'Descripción'}>
                  <Entrada
                    value={card.descripcion}
                    onChangeText={(v) => updateCard(card.key, { descripcion: v })}
                    placeholder={card.tipo === 'deuda' ? 'Opcional' : 'Comercio / concepto'}
                  />
                </Campo>

                {card.errorCard ? (
                  <Text style={{ color: colors.danger, fontSize: 13, marginBottom: spacing.sm }}>⚠️ {card.errorCard}</Text>
                ) : null}

                <Boton
                  title={card.estado === 'registrando' ? 'Registrando…' : `Registrar ${card.tipo}`}
                  onPress={() => registrar(card)}
                  loading={card.estado === 'registrando'}
                  disabled={!puedeRegistrar(card)}
                />
              </View>
            )}
          </Tarjeta>
        )
      })}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Boton title="📷 Escanear otros" variant="secondary" onPress={() => setCards([])} style={{ flex: 1 }} />
        <Boton title="Cerrar" variant="secondary" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  vacioTitulo: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  vacioTexto: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginVertical: spacing.lg },
  miniatura: { width: 64, height: 84, borderRadius: radius.sm, backgroundColor: colors.border },
  chipTipo: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
})
