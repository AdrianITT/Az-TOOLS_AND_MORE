import { useState } from 'react'
import { ScrollView, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { colors, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import * as finanzas from '../api/finanzas'
import { hoyISO, mediaUrl } from '../utils/format'
import { Boton, Campo, Entrada, EntradaFecha, EntradaMonto, Tarjeta } from '../components/ui'
import { CategoriaPicker } from '../components/CategoriaPicker'
import { FotoComprobante } from '../components/FotoComprobante'

// Crear o editar un ingreso/gasto. route.params: { tipo, item? }
export function MovimientoFormScreen({ navigation, route }) {
  const { tipo, item } = route.params
  const singular = tipo === 'ingresos' ? 'ingreso' : 'gasto'
  const editando = Boolean(item)
  const queryClient = useQueryClient()

  const [monto, setMonto] = useState(item ? String(item.monto) : '')
  const [fecha, setFecha] = useState(item?.fecha ?? hoyISO())
  const [categoria, setCategoria] = useState(item?.categoria ?? null)
  const [descripcion, setDescripcion] = useState(item?.descripcion ?? '')
  const [foto, setFoto] = useState(null)

  const categorias = useQuery({
    queryKey: ['categorias', tipo],
    queryFn: () => finanzas.listarCategorias(tipo),
  })

  const guardar = useMutation({
    mutationFn: () => {
      const datos = { monto, fecha, categoria, descripcion }
      return editando
        ? finanzas.editarMovimiento(tipo, item.id, datos, foto)
        : finanzas.crearMovimiento(tipo, datos, foto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos', tipo] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigation.goBack()
    },
  })

  const categoriasLista = categorias.data?.results ?? categorias.data ?? []

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <Tarjeta>
        <Campo label="Monto (MXN)">
          <EntradaMonto value={monto} onChangeText={setMonto} autoFocus={!editando} />
        </Campo>
        <Campo label="Fecha">
          <EntradaFecha value={fecha} onChange={setFecha} />
        </Campo>
        <Campo label="Categoría">
          <CategoriaPicker
            categorias={categoriasLista}
            value={categoria}
            onChange={setCategoria}
            onCrear={(datos) => finanzas.crearCategoria(tipo, datos)}
            queryKey={['categorias', tipo]}
          />
        </Campo>
        <Campo label="Descripción">
          <Entrada value={descripcion} onChangeText={setDescripcion} placeholder="Comercio / concepto (opcional)" />
        </Campo>
        <Campo label="Comprobante">
          <FotoComprobante value={foto} onChange={setFoto} existente={mediaUrl(item?.comprobante)} />
        </Campo>

        {guardar.isError && (
          <Text style={{ color: colors.danger, marginBottom: spacing.md }}>
            {getErrorMessage(guardar.error, 'No se pudo guardar')}
          </Text>
        )}

        <Boton
          title={editando ? 'Guardar cambios' : `Registrar ${singular}`}
          onPress={() => guardar.mutate()}
          loading={guardar.isPending}
          disabled={!monto || !fecha || !categoria}
        />
      </Tarjeta>
    </ScrollView>
  )
}
