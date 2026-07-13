import { useEffect } from 'react'
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { colors, radius, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import * as dash from '../api/dashboard'
import { fechaLarga, mediaUrl, mesLabel, money } from '../utils/format'
import { Cargando, EstadoVacio, VistaError } from '../components/ui'

// Movimientos (ingresos + gastos) de un mes. route.params: { mes: 'YYYY-MM' }
export function DetalleMesScreen({ navigation, route }) {
  const { mes } = route.params

  useEffect(() => {
    navigation.setOptions({ title: mesLabel(mes) })
  }, [navigation, mes])

  const detalle = useQuery({
    queryKey: ['dashboard', 'detalle-mes', mes],
    queryFn: () => dash.detalleMes(mes),
  })

  if (detalle.isLoading) return <Cargando />
  if (detalle.isError) return <VistaError mensaje={getErrorMessage(detalle.error)} onReintentar={detalle.refetch} />

  const movimientos = detalle.data ?? []

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
      data={movimientos}
      keyExtractor={(m, i) => `${m.tipo}-${m.fecha}-${i}`}
      ListEmptyComponent={<EstadoVacio titulo="Sin movimientos" subtitulo="No hay ingresos ni gastos en este mes." />}
      renderItem={({ item }) => {
        const esIngreso = item.tipo === 'ingreso'
        return (
          <View style={styles.fila}>
            <Text style={{ fontSize: 18 }}>{esIngreso ? '💰' : '💸'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: colors.text }}>
                {item.categoria}
                {item.descripcion ? ` · ${item.descripcion}` : ''}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{fechaLarga(item.fecha)}</Text>
            </View>
            {item.comprobante && (
              <Pressable onPress={() => navigation.navigate('Comprobante', { url: mediaUrl(item.comprobante) })}>
                <Image source={{ uri: mediaUrl(item.comprobante) }} style={styles.miniatura} />
              </Pressable>
            )}
            <Text style={{ fontSize: 15, fontWeight: '700', color: esIngreso ? colors.ingreso : colors.gasto }}>
              {esIngreso ? '+' : '−'}{money(item.monto)}
            </Text>
          </View>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
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
  miniatura: { width: 36, height: 46, borderRadius: radius.sm, backgroundColor: colors.border },
})
