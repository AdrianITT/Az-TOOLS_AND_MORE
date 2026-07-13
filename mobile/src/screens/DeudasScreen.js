import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { colors, radius, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import * as deudasApi from '../api/deudas'
import { fechaLarga, money } from '../utils/format'
import { Boton, Cargando, EstadoVacio, FAB, Tarjeta, VistaError } from '../components/ui'

const ESTADOS = [
  [null, 'Todas'],
  ['activa', 'Activas'],
  ['pagada', 'Pagadas'],
  ['vencida', 'Vencidas'],
]

const ESTADO_COLOR = { activa: colors.primary, pagada: colors.success, vencida: colors.danger }

export function DeudasScreen({ navigation }) {
  const [estado, setEstado] = useState('activa')

  const resumen = useQuery({ queryKey: ['deudas', 'resumen'], queryFn: deudasApi.resumenDeudas })
  const vencimientos = useQuery({
    queryKey: ['deudas', 'vencimientos'],
    queryFn: () => deudasApi.proximosVencimientos(30),
  })

  const lista = useInfiniteQuery({
    queryKey: ['deudas', 'lista', estado],
    queryFn: ({ pageParam }) => deudasApi.listarDeudas({ pageUrl: pageParam, estado: estado || undefined }),
    initialPageParam: null,
    getNextPageParam: (ultima) => ultima.next,
  })

  const items = useMemo(() => (lista.data ? lista.data.pages.flatMap((p) => p.results) : []), [lista.data])
  const urgentes = (vencimientos.data ?? []).filter((v) => v.dias_restantes != null && v.dias_restantes <= 7)

  if (lista.isLoading) return <Cargando />
  if (lista.isError) return <VistaError mensaje={getErrorMessage(lista.error)} onReintentar={lista.refetch} />

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 96, gap: spacing.sm }}
        onEndReached={() => lista.hasNextPage && !lista.isFetchingNextPage && lista.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={lista.isRefetching && !lista.isFetchingNextPage}
        onRefresh={() => {
          lista.refetch()
          resumen.refetch()
          vencimientos.refetch()
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
            {resumen.data && (
              <Tarjeta>
                <Text style={{ fontSize: 13, color: colors.textMuted }}>Deuda total activa</Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.deuda }}>
                  {money(resumen.data.total_deuda)}
                </Text>
              </Tarjeta>
            )}

            {urgentes.length > 0 && (
              <View style={styles.alerta}>
                <Text style={{ fontWeight: '700', color: '#8a4b08', marginBottom: 4 }}>
                  ⚠️ Vencimientos próximos (≤ 7 días)
                </Text>
                {urgentes.map((v) => (
                  <Pressable key={v.deuda_id} onPress={() => navigation.navigate('DeudaDetalle', { id: v.deuda_id })}>
                    <Text style={{ color: '#8a4b08', fontSize: 13 }}>
                      • {v.acreedor}: {money(v.saldo_actual)} — {v.dias_restantes === 0 ? 'hoy' : `en ${v.dias_restantes} día(s)`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              {ESTADOS.map(([valor, label]) => (
                <Pressable
                  key={label}
                  onPress={() => setEstado(valor)}
                  style={[styles.chip, estado === valor && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={{ fontSize: 13, color: estado === valor ? '#fff' : colors.text, fontWeight: '500' }}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<EstadoVacio titulo="Sin deudas" subtitulo="Registra una deuda con el botón + o escanea una factura a crédito." />}
        ListFooterComponent={
          lista.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} /> : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.fila} onPress={() => navigation.navigate('DeudaDetalle', { id: item.id })}>
            <View style={[styles.punto, { backgroundColor: item.categoria_color || colors.deuda }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{item.acreedor}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {item.categoria_nombre}
                {item.fecha_vencimiento ? ` · vence ${fechaLarga(item.fecha_vencimiento)}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.deuda }}>{money(item.saldo_actual)}</Text>
              <Text style={{ fontSize: 11, color: ESTADO_COLOR[item.estado] || colors.textMuted, fontWeight: '600' }}>
                {item.estado.toUpperCase()}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <FAB onPress={() => navigation.navigate('DeudaForm')} />
      <Boton
        title="📷 Escanear factura"
        variant="secondary"
        onPress={() => navigation.navigate('EscanearRecibos', { modo: 'deuda' })}
        style={styles.botonEscanear}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  alerta: {
    backgroundColor: '#fdf3e7',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#f0ce9a',
    padding: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  punto: { width: 10, height: 10, borderRadius: 5 },
  botonEscanear: { position: 'absolute', left: 20, bottom: 24, elevation: 4 },
})
