import { useMemo, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View,
} from 'react-native'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { colors, radius, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import * as finanzas from '../api/finanzas'
import { fechaLarga, mediaUrl, money } from '../utils/format'
import { Boton, Cargando, EstadoVacio, Entrada, FAB, VistaError } from '../components/ui'

/**
 * Lista de ingresos o gastos con scroll infinito (paginación DRF),
 * búsqueda y filtro por categoría. `tipo`: 'ingresos' | 'gastos'.
 */
export function MovimientosScreen({ navigation, tipo }) {
  const singular = tipo === 'ingresos' ? 'ingreso' : 'gasto'
  const color = tipo === 'ingresos' ? colors.ingreso : colors.gasto
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState(null)
  const queryClient = useQueryClient()

  const categorias = useQuery({
    queryKey: ['categorias', tipo],
    queryFn: () => finanzas.listarCategorias(tipo),
  })

  const filtros = { search: busqueda || undefined, categoria: categoria || undefined }
  const lista = useInfiniteQuery({
    queryKey: ['movimientos', tipo, filtros],
    queryFn: ({ pageParam }) => finanzas.listarMovimientos(tipo, { pageUrl: pageParam, ...filtros }),
    initialPageParam: null,
    getNextPageParam: (ultima) => ultima.next, // URL `next` literal de DRF
  })

  const items = useMemo(() => (lista.data ? lista.data.pages.flatMap((p) => p.results) : []), [lista.data])

  const eliminar = useMutation({
    mutationFn: (id) => finanzas.eliminarMovimiento(tipo, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos', tipo] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => Alert.alert('Error', getErrorMessage(err, 'No se pudo eliminar')),
  })

  function confirmarEliminar(item) {
    Alert.alert(
      `Eliminar ${singular}`,
      `${money(item.monto)} — ${item.categoria_nombre}\n¿Seguro que quieres eliminarlo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate(item.id) },
      ],
    )
  }

  if (lista.isLoading) return <Cargando />
  if (lista.isError) return <VistaError mensaje={getErrorMessage(lista.error)} onReintentar={lista.refetch} />

  const categoriasLista = categorias.data?.results ?? categorias.data ?? []

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <Entrada
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder={`Buscar ${singular}s…`}
          autoCapitalize="none"
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, nombre: 'Todas' }, ...categoriasLista]}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item: c }) => {
            const activa = categoria === c.id
            return (
              <Pressable
                onPress={() => setCategoria(c.id)}
                style={[styles.chip, activa && { backgroundColor: c.color || colors.primary, borderColor: c.color || colors.primary }]}
              >
                <Text style={[styles.chipTexto, activa && { color: '#fff' }]}>
                  {c.icono ? `${c.icono} ` : ''}{c.nombre}
                </Text>
              </Pressable>
            )
          }}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 96, gap: spacing.sm }}
        onEndReached={() => lista.hasNextPage && !lista.isFetchingNextPage && lista.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshing={lista.isRefetching && !lista.isFetchingNextPage}
        onRefresh={lista.refetch}
        ListEmptyComponent={
          <EstadoVacio
            titulo={`Sin ${singular}s`}
            subtitulo={busqueda || categoria ? 'Prueba con otros filtros.' : `Registra tu primer ${singular} con el botón +`}
          />
        }
        ListFooterComponent={
          lista.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.fila}
            onPress={() => navigation.navigate('MovimientoForm', { tipo, item })}
            onLongPress={() => confirmarEliminar(item)}
          >
            {item.comprobante ? (
              <Pressable onPress={() => navigation.navigate('Comprobante', { url: mediaUrl(item.comprobante) })}>
                <Image source={{ uri: mediaUrl(item.comprobante) }} style={styles.miniatura} />
              </Pressable>
            ) : (
              <View style={[styles.miniatura, styles.miniaturaVacia]}>
                <Text>{tipo === 'ingresos' ? '💰' : '💸'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color }}>{money(item.monto)}</Text>
              <Text style={styles.detalle} numberOfLines={1}>
                {item.categoria_nombre}
                {item.descripcion ? ` · ${item.descripcion}` : ''}
              </Text>
              <Text style={styles.fecha}>{fechaLarga(item.fecha)}</Text>
            </View>
          </Pressable>
        )}
      />

      <FAB onPress={() => navigation.navigate('MovimientoForm', { tipo })} />
      {tipo === 'gastos' && (
        <Boton
          title="📷 Escanear recibos"
          variant="secondary"
          onPress={() => navigation.navigate('EscanearRecibos', { modo: 'movimiento' })}
          style={styles.botonEscanear}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipTexto: { fontSize: 13, color: colors.text, fontWeight: '500' },
  fila: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  miniatura: { width: 48, height: 60, borderRadius: radius.sm, backgroundColor: colors.border },
  miniaturaVacia: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  detalle: { fontSize: 13, color: colors.text, marginTop: 2 },
  fecha: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  botonEscanear: { position: 'absolute', left: 20, bottom: 24, elevation: 4 },
})
