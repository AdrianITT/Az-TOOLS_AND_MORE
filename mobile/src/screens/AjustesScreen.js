import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../context/AuthContext'
import { getBaseUrl, setBaseUrl, getToken } from '../api/client'
import { Boton, Campo, Entrada, Tarjeta } from '../components/ui'
import { colors, spacing } from '../theme'

function normalizar(url) {
  let u = url.trim().replace(/\/+$/, '')
  if (u && !/^https?:\/\//.test(u)) u = `http://${u}`
  return u
}

export function AjustesScreen({ navigation }) {
  const { logueado, usuario, logout, marcarServidor } = useAuth()
  const [url, setUrl] = useState(getBaseUrl())
  const [probando, setProbando] = useState(false)
  const [resultado, setResultado] = useState(null) // {ok, mensaje}

  async function guardar() {
    const limpia = normalizar(url)
    await setBaseUrl(limpia)
    setUrl(limpia)
    marcarServidor()
    setResultado({ ok: true, mensaje: 'Dirección guardada.' })
  }

  async function probarConexion() {
    const limpia = normalizar(url)
    if (!limpia) return
    setProbando(true)
    setResultado(null)
    try {
      // /api/auth/me/ responde 200 con token válido y 401 sin él;
      // ambos significan que el servidor es alcanzable.
      const res = await fetch(`${limpia}/api/auth/me/`, {
        headers: getToken() ? { Authorization: `Token ${getToken()}` } : {},
      })
      if (res.ok || res.status === 401) {
        setResultado({ ok: true, mensaje: '✓ Servidor alcanzable.' })
      } else {
        setResultado({ ok: false, mensaje: `El servidor respondió ${res.status}. ¿Es la dirección correcta?` })
      }
    } catch {
      setResultado({ ok: false, mensaje: 'No se pudo conectar. Revisa la IP, el puerto y que estés en la misma red (LAN o Tailscale).' })
    } finally {
      setProbando(false)
    }
  }

  function confirmarLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ])
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Tarjeta>
        <Text style={styles.seccion}>Servidor</Text>
        <Campo
          label="Dirección del servidor"
          hint="Ej. http://192.168.1.101 (LAN) o http://100.96.46.88 (Tailscale)"
        >
          <Entrada
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.1.101"
          />
        </Campo>
        {resultado && (
          <Text style={{ color: resultado.ok ? colors.success : colors.danger, fontSize: 13, marginBottom: spacing.md }}>
            {resultado.mensaje}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Boton title="Guardar" onPress={guardar} disabled={!url.trim()} style={{ flex: 1 }} />
          <Boton title="Probar conexión" variant="secondary" onPress={probarConexion} loading={probando} style={{ flex: 1 }} />
        </View>
      </Tarjeta>

      {logueado && (
        <Tarjeta>
          <Text style={styles.seccion}>Sesión</Text>
          {usuario && (
            <Text style={{ color: colors.textMuted, marginBottom: spacing.md }}>
              {usuario.username}
              {usuario.rol ? ` — ${usuario.rol}` : ''}
            </Text>
          )}
          <Boton title="Cerrar sesión" variant="danger" onPress={confirmarLogout} />
        </Tarjeta>
      )}

      {navigation.canGoBack() && (
        <Boton title="Volver" variant="secondary" onPress={() => navigation.goBack()} />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  seccion: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
})
