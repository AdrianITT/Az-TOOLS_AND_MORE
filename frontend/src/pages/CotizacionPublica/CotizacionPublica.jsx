import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Phone, Mail, MessageCircle, AlertTriangle } from 'lucide-react'

const monedaFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

function formatMoneda(value) {
  return monedaFormatter.format(Number(value ?? 0))
}

function formatFecha(fechaISO) {
  if (!fechaISO) return ''
  const [year, month, day] = fechaISO.split('-')
  return `${day}/${month}/${year}`
}

export function CotizacionPublica() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/publico/cotizaciones/${token}/`)
      .then((res) => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa' }}>
        <p style={{ color: '#888' }}>Cargando cotización…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fa', padding: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '40px 32px', maxWidth: 420, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <AlertTriangle size={40} color="#e67e22" style={{ marginBottom: 12 }} />
          <h2 style={{ margin: '0 0 8px' }}>Cotización no disponible</h2>
          <p style={{ color: '#888', margin: 0 }}>
            El enlace no es válido o la cotización ya no está publicada.
            Si la recibiste de un proveedor, contactalo para pedir una nueva.
          </p>
        </div>
      </div>
    )
  }

  const { organizacion: org } = data
  const color = org.color_primario || '#3498db'
  const pdfUrl = `/api/publico/cotizaciones/${token}/pdf/`

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', padding: '24px 12px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Encabezado con marca de la organización */}
        <div style={{
          background: color, borderRadius: '12px 12px 0 0', padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 16, color: 'white',
        }}>
          {org.logo ? (
            <img src={org.logo} alt={org.nombre} style={{ height: 52, maxWidth: 140, objectFit: 'contain', background: 'white', borderRadius: 8, padding: 4 }} />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0,
            }}>
              {org.nombre?.[0] ?? '?'}
            </div>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>{org.nombre}</h1>
            <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: 14 }}>Cotización {data.numero}</p>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '0 0 12px 12px', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>

          {/* Aviso de vencimiento */}
          {data.vencida ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, background: '#fdf1d6',
              border: '1px solid #f3d99a', borderRadius: 8, padding: '10px 14px', marginBottom: 20,
            }}>
              <AlertTriangle size={18} color="#92650a" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#92650a' }}>
                Esta cotización venció el {formatFecha(data.fecha_vencimiento)}. Contactanos para pedir una actualizada.
              </span>
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: 14, margin: '0 0 20px' }}>
              Preparada para <strong style={{ color: '#333' }}>{data.cliente}</strong> ·
              válida hasta el <strong style={{ color: '#333' }}>{formatFecha(data.fecha_vencimiento)}</strong>
            </p>
          )}

          {/* Servicios */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px' }}>Servicio</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center' }}>Cant.</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Precio</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f2f2f2' }}>
                    <td style={{ padding: '10px 4px' }}>{item.servicio}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>{item.cantidad}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'right' }}>{formatMoneda(item.precio_unitario)}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'right' }}>{formatMoneda(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginTop: 16, fontSize: 14 }}>
            <span style={{ color: '#888' }}>Subtotal: {formatMoneda(data.subtotal)}</span>
            <span style={{ color: '#888' }}>IVA ({Number(data.iva_porcentaje).toFixed(0)}%): {formatMoneda(data.impuesto)}</span>
            <span style={{ fontSize: 24, fontWeight: 700, color }}>{formatMoneda(data.total)}</span>
          </div>

          {/* Descargar PDF */}
          <div style={{ textAlign: 'center', margin: '28px 0 8px' }}>
            <a
              href={pdfUrl}
              download
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: color, color: 'white', textDecoration: 'none',
                padding: '14px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600,
              }}
            >
              <Download size={18} /> Descargar PDF
            </a>
          </div>
        </div>

        {/* Contacto */}
        {(org.whatsapp || org.telefono || org.email) && (
          <div style={{ background: 'white', borderRadius: 12, padding: '18px 28px', marginTop: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14 }}>¿Dudas o querés aceptar la cotización?</p>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14 }}>
              {org.whatsapp && (
                <a
                  href={`https://wa.me/${org.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, les escribo por la cotización ${data.numero}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#25D366', textDecoration: 'none', fontWeight: 600 }}
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              {org.telefono && (
                <a href={`tel:${org.telefono}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#333', textDecoration: 'none' }}>
                  <Phone size={16} /> {org.telefono}
                </a>
              )}
              {org.email && (
                <a href={`mailto:${org.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#333', textDecoration: 'none' }}>
                  <Mail size={16} /> {org.email}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
