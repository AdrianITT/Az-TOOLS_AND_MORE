import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { getBaseUrl, getErrorMessage } from '../api/client'
import { Boton, Campo, Entrada } from '../components/ui'
import { colors, spacing } from '../theme'

export function LoginScreen({ navigation }) {
  const { login, hayServidor } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar() {
    setError('')
    setCargando(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(getErrorMessage(err, 'Usuario o contraseña incorrectos'))
    } finally {
      setCargando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>💰</Text>
        <Text style={styles.titulo}>Finanzas</Text>
        <Text style={styles.subtitulo}>Az Tools & More</Text>

        {!hayServidor && (
          <View style={styles.aviso}>
            <Text style={{ color: colors.warning, fontSize: 13 }}>
              Primero configura la dirección del servidor en Ajustes.
            </Text>
          </View>
        )}

        <Campo label="Usuario">
          <Entrada
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="usuario"
          />
        </Campo>
        <Campo label="Contraseña" error={error || null}>
          <Entrada
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            onSubmitEditing={entrar}
          />
        </Campo>

        <Boton
          title="Entrar"
          onPress={entrar}
          loading={cargando}
          disabled={!username.trim() || !password || !hayServidor}
        />

        <Pressable onPress={() => navigation.navigate('Ajustes')} style={{ marginTop: spacing.xl, alignSelf: 'center' }}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>
            ⚙️ Ajustes del servidor{getBaseUrl() ? ` (${getBaseUrl()})` : ''}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  logo: { fontSize: 52, textAlign: 'center' },
  titulo: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: colors.text },
  subtitulo: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  aviso: {
    backgroundColor: '#fdf3e7',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
})
