import { useState } from 'react'
import {
  ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, parseISO } from 'date-fns'
import { colors, radius, spacing } from '../theme'
import { fechaLarga } from '../utils/format'

export function Boton({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const esPrimario = variant === 'primary'
  const esPeligro = variant === 'danger'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.boton,
        esPrimario && { backgroundColor: colors.primary },
        esPeligro && { backgroundColor: colors.danger },
        variant === 'secondary' && styles.botonSecundario,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} size="small" />
      ) : (
        <Text style={[styles.botonTexto, variant === 'secondary' && { color: colors.text }]}>{title}</Text>
      )}
    </Pressable>
  )
}

export function Campo({ label, error, children, hint }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

export function Entrada({ style, ...props }) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.entrada, style]}
      {...props}
    />
  )
}

// Selector de fecha: muestra la fecha como botón y abre el picker nativo.
// value/onChange trabajan con strings ISO 'YYYY-MM-DD' (formato de la API).
export function EntradaFecha({ value, onChange, placeholder = 'Seleccionar fecha' }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Pressable style={styles.entrada} onPress={() => setAbierto(true)}>
        <Text style={{ color: value ? colors.text : colors.textMuted }}>
          {value ? fechaLarga(value) : placeholder}
        </Text>
      </Pressable>
      {abierto && (
        <DateTimePicker
          value={value ? parseISO(value) : new Date()}
          mode="date"
          onChange={(event, fecha) => {
            setAbierto(false)
            if (event.type === 'set' && fecha) onChange(format(fecha, 'yyyy-MM-dd'))
          }}
        />
      )}
    </>
  )
}

export function EntradaMonto({ value, onChangeText, ...props }) {
  return (
    <Entrada
      value={value}
      keyboardType="decimal-pad"
      placeholder="0.00"
      onChangeText={(t) => onChangeText(t.replace(',', '.').replace(/[^0-9.]/g, ''))}
      {...props}
    />
  )
}

export function Cargando({ texto }) {
  return (
    <View style={styles.centrado}>
      <ActivityIndicator size="large" color={colors.primary} />
      {texto ? <Text style={{ color: colors.textMuted, marginTop: spacing.md }}>{texto}</Text> : null}
    </View>
  )
}

export function VistaError({ mensaje, onReintentar }) {
  return (
    <View style={styles.centrado}>
      <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: spacing.lg }}>{mensaje}</Text>
      {onReintentar && <Boton title="Reintentar" variant="secondary" onPress={onReintentar} />}
    </View>
  )
}

export function EstadoVacio({ titulo, subtitulo }) {
  return (
    <View style={[styles.centrado, { paddingVertical: 48 }]}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{titulo}</Text>
      {subtitulo ? (
        <Text style={{ color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' }}>{subtitulo}</Text>
      ) : null}
    </View>
  )
}

export function Tarjeta({ children, style }) {
  return <View style={[styles.tarjeta, style]}>{children}</View>
}

export function ModalHoja({ visible, onClose, titulo, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalFondo} onPress={onClose}>
        <Pressable style={styles.modalHoja} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{titulo}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 22, color: colors.textMuted }}>✕</Text>
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export function FAB({ onPress, label = '+' }) {
  return (
    <Pressable style={styles.fab} onPress={onPress}>
      <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  boton: {
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  botonSecundario: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  botonTexto: { color: '#fff', fontWeight: '600', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  error: { fontSize: 12, color: colors.danger, marginTop: 4 },
  entrada: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    minHeight: 44,
    justifyContent: 'center',
  },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  tarjeta: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalHoja: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: colors.text },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
})
