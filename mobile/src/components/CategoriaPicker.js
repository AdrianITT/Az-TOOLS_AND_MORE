import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { colors, radius, spacing } from '../theme'
import { getErrorMessage } from '../api/client'
import { Boton, Campo, Entrada } from './ui'

/**
 * Selector de categoría como chips horizontales + creación inline
 * (equivalente móvil del "+ Nueva categoría" del frontend web).
 *
 * - `categorias`: lista [{id, nombre, color, icono}]
 * - `onCrear(datos)`: llama a la API y devuelve la categoría creada
 * - `queryKey`: se invalida al crear para refrescar la lista
 * - `conTipo`: para deudas, muestra el selector de tipo_amortizacion
 */
export function CategoriaPicker({ categorias = [], value, onChange, onCrear, queryKey, conTipo = false }) {
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipoAmortizacion, setTipoAmortizacion] = useState('cuotas_fijas')
  const queryClient = useQueryClient()

  const crear = useMutation({
    mutationFn: () => onCrear(conTipo ? { nombre, tipo_amortizacion: tipoAmortizacion } : { nombre }),
    onSuccess: (nueva) => {
      queryClient.invalidateQueries({ queryKey })
      onChange(nueva.id)
      setCreando(false)
      setNombre('')
    },
  })

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {categorias.map((c) => {
          const activa = value === c.id
          return (
            <Pressable
              key={c.id}
              onPress={() => onChange(c.id)}
              style={[styles.chip, activa && { backgroundColor: c.color || colors.primary, borderColor: c.color || colors.primary }]}
            >
              <Text style={[styles.chipTexto, activa && { color: '#fff' }]}>
                {c.icono ? `${c.icono} ` : ''}{c.nombre}
              </Text>
            </Pressable>
          )
        })}
        <Pressable style={[styles.chip, styles.chipNueva]} onPress={() => setCreando((v) => !v)}>
          <Text style={[styles.chipTexto, { color: colors.primary }]}>+ Nueva</Text>
        </Pressable>
      </ScrollView>

      {creando && (
        <View style={styles.formNueva}>
          <Campo label="Nombre de la categoría" error={crear.isError ? getErrorMessage(crear.error) : null}>
            <Entrada value={nombre} onChangeText={setNombre} placeholder="Ej. Transporte" autoFocus />
          </Campo>
          {conTipo && (
            <Campo label="Tipo de deuda">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {[
                  ['cuotas_fijas', 'Cuotas fijas'],
                  ['revolvente', 'Revolvente'],
                  ['cuenta_por_pagar', 'Cuenta por pagar'],
                ].map(([valor, label]) => (
                  <Pressable
                    key={valor}
                    onPress={() => setTipoAmortizacion(valor)}
                    style={[styles.chip, tipoAmortizacion === valor && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <Text style={[styles.chipTexto, tipoAmortizacion === valor && { color: '#fff' }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </Campo>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Boton
              title="Crear"
              onPress={() => crear.mutate()}
              disabled={!nombre.trim()}
              loading={crear.isPending}
              style={{ flex: 1 }}
            />
            <Boton title="Cancelar" variant="secondary" onPress={() => setCreando(false)} style={{ flex: 1 }} />
          </View>
        </View>
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
    paddingVertical: 8,
  },
  chipNueva: { borderStyle: 'dashed', borderColor: colors.primary },
  chipTexto: { fontSize: 13, color: colors.text, fontWeight: '500' },
  formNueva: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
})
