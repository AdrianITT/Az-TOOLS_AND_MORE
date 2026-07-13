import { useMemo, useState } from 'react'
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BarChart, PieChart } from 'react-native-gifted-charts'
import { useQuery } from '@tanstack/react-query'
import { colors, radius, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import * as dash from '../api/dashboard'
import * as deudasApi from '../api/deudas'
import { fechaLarga, mesLabel, money } from '../utils/format'
import { Cargando, Tarjeta, VistaError } from '../components/ui'

// Paleta de respaldo (orden fijo) para categorías sin color propio
const PALETA_CATEGORIAS = ['#3498db', '#e67e22', '#8e44ad', '#16a085', '#c0392b', '#f1c40f', '#2c3e50', '#7f8c8d']

export function DashboardScreen({ navigation }) {
  const [tipoCategoria, setTipoCategoria] = useState('gastos')
  const [periodo, setPeriodo] = useState('mes')

  const meses = useQuery({ queryKey: ['dashboard', 'meses'], queryFn: dash.dashboard })
  const porCategoria = useQuery({
    queryKey: ['dashboard', 'categorias', periodo, tipoCategoria],
    queryFn: () => dash.resumenPorCategoria(periodo, tipoCategoria),
  })
  const porDia = useQuery({
    queryKey: ['dashboard', 'dias', periodo],
    queryFn: () => dash.gastosPorDia(periodo),
  })
  const resumenDeuda = useQuery({ queryKey: ['deudas', 'resumen'], queryFn: deudasApi.resumenDeudas })

  const anchoGrafica = Dimensions.get('window').width - spacing.md * 2 - spacing.lg * 2

  // La API devuelve del mes más reciente al más antiguo; el gráfico va cronológico
  const cronologico = useMemo(() => (meses.data ? [...meses.data].reverse() : []), [meses.data])

  const barras = useMemo(
    () =>
      cronologico.flatMap((m) => [
        {
          value: Number(m.total_ingresos),
          label: mesLabel(m.mes),
          spacing: 2,
          labelWidth: 52,
          frontColor: colors.ingreso,
          onPress: () => navigation.navigate('DetalleMes', { mes: m.mes }),
        },
        {
          value: Number(m.total_gastos),
          frontColor: colors.gasto,
          onPress: () => navigation.navigate('DetalleMes', { mes: m.mes }),
        },
      ]),
    [cronologico, navigation],
  )

  if (meses.isLoading) return <Cargando />
  if (meses.isError) return <VistaError mensaje={getErrorMessage(meses.error)} onReintentar={meses.refetch} />

  const mesActual = meses.data?.[0]
  const balance = mesActual ? Number(mesActual.ganancia) : 0
  const categorias = porCategoria.data ?? []
  const dias = porDia.data ?? []
  const maxDia = Math.max(1, ...dias.map((d) => Number(d.total)))

  const datosPie = categorias.map((c, i) => ({
    value: Number(c.total),
    color: PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length],
    texto: c.categoria,
    porcentaje: c.porcentaje,
  }))

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}
      refreshControl={
        <RefreshControl
          refreshing={meses.isRefetching}
          onRefresh={() => {
            meses.refetch()
            porCategoria.refetch()
            porDia.refetch()
            resumenDeuda.refetch()
          }}
        />
      }
    >
      {/* Héroe: balance del mes en curso */}
      {mesActual && (
        <Tarjeta style={{ backgroundColor: balance >= 0 ? '#eafaf1' : '#fdedec', borderColor: 'transparent' }}>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>Balance de {mesLabel(mesActual.mes)}</Text>
          <Text style={{ fontSize: 30, fontWeight: '700', color: balance >= 0 ? '#1e8449' : '#b03a2e' }}>
            {money(balance)}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm }}>
            <Text style={styles.kpi}>
              Ingresos <Text style={{ fontWeight: '700', color: colors.text }}>{money(mesActual.total_ingresos)}</Text>
            </Text>
            <Text style={styles.kpi}>
              Gastos <Text style={{ fontWeight: '700', color: colors.text }}>{money(mesActual.total_gastos)}</Text>
            </Text>
          </View>
          {resumenDeuda.data && Number(resumenDeuda.data.total_deuda) > 0 && (
            <Text style={[styles.kpi, { marginTop: 4 }]}>
              Deuda activa <Text style={{ fontWeight: '700', color: colors.deuda }}>{money(resumenDeuda.data.total_deuda)}</Text>
            </Text>
          )}
        </Tarjeta>
      )}

      {/* Tendencia 12 meses */}
      <Tarjeta>
        <Text style={styles.tituloGrafica}>Ingresos vs gastos — últimos 12 meses</Text>
        <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md }}>
          <Leyenda color={colors.ingreso} label="Ingresos" />
          <Leyenda color={colors.gasto} label="Gastos" />
        </View>
        <BarChart
          data={barras}
          width={anchoGrafica}
          height={180}
          barWidth={10}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          spacing={14}
          noOfSections={4}
          xAxisThickness={1}
          xAxisColor={colors.border}
          yAxisThickness={0}
          rulesColor={colors.border}
          rulesType="solid"
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
          formatYLabel={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(Math.round(Number(v))))}
          isAnimated
        />
        <Text style={styles.pista}>Toca un mes para ver el detalle de movimientos.</Text>
      </Tarjeta>

      {/* Desglose por categoría */}
      <Tarjeta>
        <Text style={styles.tituloGrafica}>Por categoría</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
          <Selector opciones={[['gastos', 'Gastos'], ['ingresos', 'Ingresos']]} valor={tipoCategoria} onCambiar={setTipoCategoria} />
          <Selector opciones={[['mes', 'Este mes'], ['año', 'Este año']]} valor={periodo} onCambiar={setPeriodo} />
        </View>
        {datosPie.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sin datos para este periodo.</Text>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <PieChart data={datosPie} donut radius={90} innerRadius={55} innerCircleColor={colors.card} />
            <View style={{ alignSelf: 'stretch', marginTop: spacing.md, gap: 6 }}>
              {datosPie.map((d) => (
                <View key={d.texto} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{d.texto}</Text>
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>{money(d.value)}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, width: 48, textAlign: 'right' }}>
                    {Number(d.porcentaje).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Tarjeta>

      {/* Días de mayor gasto: barras horizontales con etiqueta visible */}
      <Tarjeta>
        <Text style={styles.tituloGrafica}>Días de mayor gasto ({periodo === 'mes' ? 'este mes' : 'este año'})</Text>
        {dias.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Sin gastos en este periodo.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {dias.map((d) => (
              <View key={d.fecha}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{fechaLarga(d.fecha)}</Text>
                  <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{money(d.total)}</Text>
                </View>
                <View style={styles.barraFondo}>
                  <View style={[styles.barraDia, { width: `${(Number(d.total) / maxDia) * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}
      </Tarjeta>
    </ScrollView>
  )
}

function Leyenda({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
    </View>
  )
}

function Selector({ opciones, valor, onCambiar }) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: 999, overflow: 'hidden' }}>
      {opciones.map(([v, label]) => (
        <Pressable
          key={v}
          onPress={() => onCambiar(v)}
          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: valor === v ? colors.primary : colors.card }}
        >
          <Text style={{ fontSize: 12, color: valor === v ? '#fff' : colors.text, fontWeight: '500' }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  kpi: { fontSize: 13, color: colors.textMuted },
  tituloGrafica: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  pista: { fontSize: 11, color: colors.textMuted, marginTop: spacing.sm },
  barraFondo: { height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden' },
  barraDia: { height: '100%', backgroundColor: colors.gasto, borderRadius: 4 },
})
