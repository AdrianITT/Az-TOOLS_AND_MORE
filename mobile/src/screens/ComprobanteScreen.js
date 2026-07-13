import { Image, View } from 'react-native'

// Visor a pantalla completa del comprobante. route.params: { url } (ya absoluta)
export function ComprobanteScreen({ route }) {
  const { url } = route.params
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Image source={{ uri: url }} style={{ flex: 1 }} resizeMode="contain" />
    </View>
  )
}
