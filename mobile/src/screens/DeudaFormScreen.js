import { useMemo, useState } from 'react'
import { ScrollView, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { colors, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import * as deudasApi from '../api/deudas'
import { hoyISO } from '../utils/format'
import { Boton, Campo, Entrada, EntradaFecha, EntradaMonto, Tarjeta } from '../components/ui'
import { CategoriaPicker } from '../components/CategoriaPicker'
import { FotoComprobante } from '../components/FotoComprobante'

export function DeudaFormScreen({ navigation }) {
  const queryClient = useQueryClient()
  const [categoria, setCategoria] = useState(null)
  const [acreedor, setAcreedor] = useState('')
  const [montoOriginal, setMontoOriginal] = useState('')
  const [fechaInicio, setFechaInicio] = useState(hoyISO())
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [tasa, setTasa] = useState('')
  const [pagoPeriodico, setPagoPeriodico] = useState('')
  const [diaPago, setDiaPago] = useState('')
  const [notas, setNotas] = useState('')
  const [foto, setFoto] = useState(null)

  const categorias = useQuery({ queryKey: ['categorias-deudas'], queryFn: deudasApi.listarCategoriasDeuda })
  const categoriasLista = categorias.data?.results ?? categorias.data ?? []
  const tipoCategoria = useMemo(
    () => categoriasLista.find((c) => c.id === categoria)?.tipo_amortizacion,
    [categoriasLista, categoria],
  )

  const guardar = useMutation({
    mutationFn: () =>
      deudasApi.crearDeuda(
        {
          categoria,
          acreedor,
          monto_original: montoOriginal,
          fecha_inicio: fechaInicio,
          fecha_vencimiento: fechaVencimiento || undefined,
          tasa_interes_anual: tasa || undefined,
          pago_periodico: pagoPeriodico || undefined,
          dia_pago: diaPago || undefined,
          notas: notas || undefined,
        },
        foto,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deudas'] })
      navigation.goBack()
    },
  })

  // Campos condicionales según el tipo de amortización de la categoría
  const conPagos = tipoCategoria === 'cuotas_fijas' || tipoCategoria === 'revolvente'
  const conVencimiento = tipoCategoria !== 'revolvente'

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.lg }}
      keyboardShouldPersistTaps="handled"
    >
      <Tarjeta>
        <Campo label="Categoría">
          <CategoriaPicker
            categorias={categoriasLista}
            value={categoria}
            onChange={setCategoria}
            onCrear={deudasApi.crearCategoriaDeuda}
            queryKey={['categorias-deudas']}
            conTipo
          />
        </Campo>
        <Campo label="Acreedor">
          <Entrada value={acreedor} onChangeText={setAcreedor} placeholder="Proveedor, banco…" />
        </Campo>
        <Campo label="Monto original (MXN)">
          <EntradaMonto value={montoOriginal} onChangeText={setMontoOriginal} />
        </Campo>
        <Campo label="Fecha de inicio">
          <EntradaFecha value={fechaInicio} onChange={setFechaInicio} />
        </Campo>
        {conVencimiento && (
          <Campo label="Fecha de vencimiento" hint="Opcional">
            <EntradaFecha value={fechaVencimiento} onChange={setFechaVencimiento} />
          </Campo>
        )}
        {conPagos && (
          <>
            <Campo label="Pago periódico (MXN)" hint="Opcional">
              <EntradaMonto value={pagoPeriodico} onChangeText={setPagoPeriodico} />
            </Campo>
            <Campo label="Día de pago (1–31)" hint="Opcional">
              <Entrada
                value={diaPago}
                onChangeText={(t) => setDiaPago(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </Campo>
            <Campo label="Tasa de interés anual %" hint="Opcional">
              <EntradaMonto value={tasa} onChangeText={setTasa} />
            </Campo>
          </>
        )}
        <Campo label="Notas">
          <Entrada value={notas} onChangeText={setNotas} placeholder="Opcional" />
        </Campo>
        <Campo label="Comprobante">
          <FotoComprobante value={foto} onChange={setFoto} />
        </Campo>

        {guardar.isError && (
          <Text style={{ color: colors.danger, marginBottom: spacing.md }}>
            {getErrorMessage(guardar.error, 'No se pudo crear la deuda')}
          </Text>
        )}

        <Boton
          title="Registrar deuda"
          onPress={() => guardar.mutate()}
          loading={guardar.isPending}
          disabled={!categoria || !acreedor.trim() || !montoOriginal || !fechaInicio}
        />
      </Tarjeta>
    </ScrollView>
  )
}
