import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { elegirDeGaleria, prepararFoto, tomarFoto } from '../utils/fotos'

// Adjuntar comprobante (foto) a un formulario. `value` es un asset
// {uri, name, type} ya comprimido, o null. `existente` es la URL del
// comprobante ya guardado (al editar) para mostrarla si no hay foto nueva.
export function FotoComprobante({ value, onChange, existente }) {
  async function capturar(fn) {
    const assets = await fn()
    if (assets.length) onChange(await prepararFoto(assets[0]))
  }

  const preview = value?.uri || existente

  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
      {preview ? (
        <Image source={{ uri: preview }} style={styles.miniatura} />
      ) : (
        <View style={[styles.miniatura, styles.miniaturaVacia]}>
          <Text style={{ fontSize: 22 }}>🧾</Text>
        </View>
      )}
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable style={styles.botonMini} onPress={() => capturar(tomarFoto)}>
            <Text style={styles.botonMiniTexto}>📷 Cámara</Text>
          </Pressable>
          <Pressable style={styles.botonMini} onPress={() => capturar(() => elegirDeGaleria())}>
            <Text style={styles.botonMiniTexto}>🖼️ Galería</Text>
          </Pressable>
        </View>
        {value && (
          <Pressable onPress={() => onChange(null)}>
            <Text style={{ color: colors.danger, fontSize: 13 }}>Quitar foto</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  miniatura: { width: 64, height: 84, borderRadius: radius.sm, backgroundColor: colors.border },
  miniaturaVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  botonMini: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  botonMiniTexto: { fontSize: 13, color: colors.text },
})
