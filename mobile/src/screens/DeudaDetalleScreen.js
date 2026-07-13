import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { colors, radius, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import * as deudasApi from '../api/deudas'
import { fechaLarga, hoyISO, mediaUrl, money } from '../utils/format'
import { Boton, Campo, Cargando, Entrada, EntradaFecha, EntradaMonto, ModalHoja, Tarjeta, VistaError } from '../components/ui'
import { FotoComprobante } from '../components/FotoComprobante'

const TIPO_LABEL = {
  revolvente: 'Revolvente',
  cuotas_fijas: 'Cuotas fijas',
  cuenta_por_pagar: 'Cuenta por pagar',
}

export function DeudaDetalleScreen({ navigation, route }) {
  const { id } = route.params
  const queryClient = useQueryClient()
  const [pagoAbierto, setPagoAbierto] = useState(false)

  const deuda = useQuery({ queryKey: ['deudas', 'detalle', id], queryFn: () => deudasApi.obtenerDeuda(id) })
  const pagos = useQuery({ queryKey: ['deudas', 'pagos', id], queryFn: () => deudasApi.listarPagos(id) })

  if (deuda.isLoading) return <Cargando />
  if (deuda.isError) return <VistaError mensaje={getErrorMessage(deuda.error)} onReintentar={deuda.refetch} />

  const d = deuda.data
  const listaPagos = pagos.data?.results ?? pagos.data ?? []
  const pagado = Number(d.monto_original) - Number(d.saldo_actual)
  const progreso = Number(d.monto_original) > 0 ? Math.min(1, pagado / Number(d.monto_original)) : 0

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Tarjeta>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{d.acreedor}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>
              {d.categoria_nombre} · {TIPO_LABEL[d.categoria_tipo] || d.categoria_tipo}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: d.estado === 'pagada' ? colors.success : d.estado === 'vencida' ? colors.danger : colors.primary }}>
            {d.estado.toUpperCase()}
          </Text>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Saldo actual</Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.deuda }}>{money(d.saldo_actual)}</Text>
          <View style={styles.barra}>
            <View style={[styles.barraRelleno, { width: `${progreso * 100}%` }]} />
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            Pagado {money(pagado)} de {money(d.monto_original)}
          </Text>
        </View>

        <View style={{ marginTop: spacing.lg, gap: 4 }}>
          <Dato label="Inicio" valor={fechaLarga(d.fecha_inicio)} />
          {d.fecha_vencimiento && <Dato label="Vencimiento" valor={fechaLarga(d.fecha_vencimiento)} />}
          {d.pago_periodico && <Dato label="Pago periódico" valor={money(d.pago_periodico)} />}
          {d.dia_pago && <Dato label="Día de pago" valor={`Día ${d.dia_pago}`} />}
          {d.tasa_interes_anual && <Dato label="Tasa anual" valor={`${d.tasa_interes_anual}%`} />}
          {d.notas ? <Dato label="Notas" valor={d.notas} /> : null}
        </View>

        {d.comprobante && (
          <Pressable
            onPress={() => navigation.navigate('Comprobante', { url: mediaUrl(d.comprobante) })}
            style={{ marginTop: spacing.md }}
          >
            <Image source={{ uri: mediaUrl(d.comprobante) }} style={styles.comprobante} />
          </Pressable>
        )}

        {d.estado !== 'pagada' && (
          <Boton title="💵 Registrar pago" onPress={() => setPagoAbierto(true)} style={{ marginTop: spacing.lg }} />
        )}
      </Tarjeta>

      <Tarjeta>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>
          Historial de pagos
        </Text>
        {listaPagos.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Aún no hay pagos registrados.</Text>
        ) : (
          listaPagos.map((p) => (
            <View key={p.id} style={styles.pagoFila}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{money(p.monto)}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {fechaLarga(p.fecha)} · saldo: {money(p.saldo_resultante)}
                </Text>
                {p.notas ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{p.notas}</Text> : null}
              </View>
              {p.comprobante && (
                <Pressable onPress={() => navigation.navigate('Comprobante', { url: mediaUrl(p.comprobante) })}>
                  <Image source={{ uri: mediaUrl(p.comprobante) }} style={styles.pagoMiniatura} />
                </Pressable>
              )}
            </View>
          ))
        )}
      </Tarjeta>

      <PagoModal
        visible={pagoAbierto}
        onClose={() => setPagoAbierto(false)}
        deuda={d}
        onRegistrado={() => {
          setPagoAbierto(false)
          queryClient.invalidateQueries({ queryKey: ['deudas'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        }}
      />
    </ScrollView>
  )
}

function Dato({ label, valor }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right' }}>{valor}</Text>
    </View>
  )
}

function PagoModal({ visible, onClose, deuda, onRegistrado }) {
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [notas, setNotas] = useState('')
  const [foto, setFoto] = useState(null)
  const [gastosSel, setGastosSel] = useState([])

  // Gastos ya registrados que se pueden vincular como cubiertos por este pago
  const gastos = useQuery({
    queryKey: ['gastos-sin-pago'],
    queryFn: deudasApi.gastosSinPago,
    enabled: visible,
  })
  const gastosLista = gastos.data?.results ?? gastos.data ?? []

  const registrar = useMutation({
    mutationFn: () =>
      deudasApi.registrarPago(
        deuda.id,
        { monto, fecha, notas: notas || undefined, gastos_cubiertos_ids: gastosSel.length ? gastosSel : undefined },
        foto,
      ),
    onSuccess: () => {
      setMonto('')
      setNotas('')
      setFoto(null)
      setGastosSel([])
      onRegistrado()
    },
  })

  function toggleGasto(id) {
    setGastosSel((sel) => (sel.includes(id) ? sel.filter((g) => g !== id) : [...sel, id]))
  }

  return (
    <ModalHoja visible={visible} onClose={onClose} titulo={`Pago a ${deuda.acreedor}`}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Campo label="Monto del pago (MXN)" hint={`Saldo actual: ${money(deuda.saldo_actual)}`}>
          <EntradaMonto value={monto} onChangeText={setMonto} autoFocus />
        </Campo>
        <Campo label="Fecha">
          <EntradaFecha value={fecha} onChange={setFecha} />
        </Campo>
        <Campo label="Notas">
          <Entrada value={notas} onChangeText={setNotas} placeholder="Opcional" />
        </Campo>
        <Campo label="Comprobante">
          <FotoComprobante value={foto} onChange={setFoto} />
        </Campo>

        {gastosLista.length > 0 && (
          <Campo label="Vincular gastos cubiertos" hint="Opcional: gastos ya registrados que este pago cubre">
            {gastosLista.slice(0, 15).map((g) => {
              const activo = gastosSel.includes(g.id)
              return (
                <Pressable
                  key={g.id}
                  onPress={() => toggleGasto(g.id)}
                  style={[styles.gastoOpcion, activo && { borderColor: colors.primary, backgroundColor: '#eaf4fc' }]}
                >
                  <Text style={{ fontSize: 13, color: colors.text }}>
                    {activo ? '☑' : '☐'} {money(g.monto)} · {g.categoria_nombre}
                    {g.descripcion ? ` · ${g.descripcion}` : ''} ({fechaLarga(g.fecha)})
                  </Text>
                </Pressable>
              )
            })}
          </Campo>
        )}

        {registrar.isError && (
          <Text style={{ color: colors.danger, marginBottom: spacing.md }}>
            {getErrorMessage(registrar.error, 'No se pudo registrar el pago')}
          </Text>
        )}

        <Boton
          title="Registrar pago"
          onPress={() => registrar.mutate()}
          loading={registrar.isPending}
          disabled={!monto || !fecha}
          style={{ marginBottom: spacing.xl }}
        />
      </ScrollView>
    </ModalHoja>
  )
}

const styles = StyleSheet.create({
  barra: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barraRelleno: { height: '100%', backgroundColor: colors.success, borderRadius: 4 },
  comprobante: { width: 72, height: 96, borderRadius: radius.sm, backgroundColor: colors.border },
  pagoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pagoMiniatura: { width: 40, height: 52, borderRadius: radius.sm, backgroundColor: colors.border },
  gastoOpcion: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: 6,
  },
})
