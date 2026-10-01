import { useEffect, useState } from 'react'
import { Plus, Download, Pencil, Trash2 } from 'lucide-react'
import { api, getErrorMessage } from '../../api/client'
import { PageHeader } from '../PageHeader'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Paginacion } from '../../components/ui/Paginacion'
import { ReciboForm } from './ReciboForm'
import formStyles from '../shared-form.module.css'

export function Recibos() {
  const [recibos, setRecibos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  function load(p = page) {
    setLoading(true)
    api
      .get('/finanzas/recibos/', { page: p })
      .then((data) => {
        setRecibos(data.results ?? data)
        setCount(data.count ?? (data.results ?? data).length)
      })
      .catch((err) => {
        if (err.status === 404 && p > 1) {
          setPage(p - 1)
          return load(p - 1)
        }
        setError(getErrorMessage(err, 'No se pudieron cargar los recibos'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => load(1), []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id) {
    try {
      await api.delete(`/finanzas/recibos/${id}/`)
      setConfirmDeleteId(null)
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo eliminar el recibo'))
    }
  }

  async function descargarPDF(id) {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/finanzas/recibos/${id}/pdf/`, {
        headers: { Authorization: `Token ${token}` },
      })
      if (!res.ok) throw new Error('pdf')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo_${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo descargar el PDF')
    }
  }

  if (loading && recibos.length === 0) return <p>Cargando…</p>

  const formatMoneda = (num) => `$${parseFloat(num || 0).toFixed(2)}`

  return (
    <div>
      <PageHeader
        title="Recibos"
        action={
          <Button onClick={() => { setEditingId(null); setShowForm(!showForm) }}>
            <Plus size={16} style={{ marginRight: 8 }} /> Nuevo recibo
          </Button>
        }
      />

      {error && <p className={formStyles.error}>{error}</p>}

      {showForm && (
        <ReciboForm
          id={editingId}
          onSaved={() => { setShowForm(false); setEditingId(null); load() }}
          onCancel={() => { setShowForm(false); setEditingId(null) }}
        />
      )}

      <Card style={{ marginBottom: 20 }}>
        {recibos.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
            Sin recibos. {!showForm && <button onClick={() => setShowForm(true)} style={{ color: '#3498db', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>Crear uno.</button>}
          </p>
        ) : (
          <>
            <Table
              rowKey={(r) => r.id}
              columns={[
                { key: 'cliente_display', header: 'Cliente' },
                { key: 'producto_display', header: 'Producto/Servicio' },
                { key: 'monto_total', header: 'Monto total', render: (r) => formatMoneda(r.monto_total) },
                { key: 'monto_pagado', header: 'Pagado', render: (r) => formatMoneda(r.monto_pagado) },
                { key: 'monto_restante', header: 'Restante', render: (r) => <span style={{ color: r.monto_restante === '0.00' ? '#27ae60' : '#e74c3c' }}>{formatMoneda(r.monto_restante)}</span> },
                { key: 'fecha_creacion', header: 'Fecha', render: (r) => new Date(r.fecha_creacion).toLocaleDateString() },
                {
                  key: 'acciones',
                  header: '',
                  render: (r) => (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="secondary" title="Descargar PDF" onClick={() => descargarPDF(r.id)}>
                        <Download size={16} />
                      </Button>
                      <Button variant="secondary" title="Editar" onClick={() => { setEditingId(r.id); setShowForm(true) }}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="danger" title="Eliminar" onClick={() => setConfirmDeleteId(r.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={recibos}
            />
            <Paginacion
              page={page}
              count={count}
              onPage={(p) => {
                setPage(p)
                load(p)
              }}
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar recibo"
        message="¿Estás seguro de que querés eliminar este recibo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
