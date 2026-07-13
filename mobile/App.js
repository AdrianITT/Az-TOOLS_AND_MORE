import { StatusBar } from 'expo-status-bar'
import { Pressable, Text } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { colors } from './src/theme'
import { Cargando } from './src/components/ui'
import { LoginScreen } from './src/screens/LoginScreen'
import { AjustesScreen } from './src/screens/AjustesScreen'
import { MovimientosScreen } from './src/screens/MovimientosScreen'
import { MovimientoFormScreen } from './src/screens/MovimientoFormScreen'
import { EscanearRecibosScreen } from './src/screens/EscanearRecibosScreen'
import { ComprobanteScreen } from './src/screens/ComprobanteScreen'
import { DeudasScreen } from './src/screens/DeudasScreen'
import { DeudaFormScreen } from './src/screens/DeudaFormScreen'
import { DeudaDetalleScreen } from './src/screens/DeudaDetalleScreen'
import { DashboardScreen } from './src/screens/DashboardScreen'
import { DetalleMesScreen } from './src/screens/DetalleMesScreen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

const Stack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()

function IngresosTab(props) {
  return <MovimientosScreen {...props} tipo="ingresos" />
}

function GastosTab(props) {
  return <MovimientosScreen {...props} tipo="gastos" />
}

function iconoTab(emoji) {
  return ({ focused }) => <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
}

function MainTabs({ navigation }) {
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerRight: () => (
          <Pressable onPress={() => navigation.navigate('Ajustes')} hitSlop={10}>
            <Text style={{ fontSize: 18, paddingHorizontal: 16 }}>⚙️</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="Ingresos" component={IngresosTab} options={{ tabBarIcon: iconoTab('💰') }} />
      <Tabs.Screen name="Gastos" component={GastosTab} options={{ tabBarIcon: iconoTab('💸') }} />
      <Tabs.Screen name="Deudas" component={DeudasScreen} options={{ tabBarIcon: iconoTab('💳') }} />
      <Tabs.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: iconoTab('📊') }} />
    </Tabs.Navigator>
  )
}

function Navegacion() {
  const { cargando, logueado } = useAuth()

  if (cargando) return <Cargando />

  return (
    <Stack.Navigator>
      {logueado ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="MovimientoForm"
            component={MovimientoFormScreen}
            options={({ route }) => ({
              presentation: 'modal',
              title: `${route.params?.item ? 'Editar' : 'Nuevo'} ${route.params?.tipo === 'ingresos' ? 'ingreso' : 'gasto'}`,
            })}
          />
          <Stack.Screen
            name="EscanearRecibos"
            component={EscanearRecibosScreen}
            options={({ route }) => ({
              presentation: 'modal',
              title: route.params?.modo === 'deuda' ? 'Escanear facturas a crédito' : 'Escanear recibos',
            })}
          />
          <Stack.Screen name="DeudaForm" component={DeudaFormScreen} options={{ presentation: 'modal', title: 'Nueva deuda' }} />
          <Stack.Screen name="DeudaDetalle" component={DeudaDetalleScreen} options={{ title: 'Deuda' }} />
          <Stack.Screen name="DetalleMes" component={DetalleMesScreen} options={{ title: 'Detalle del mes' }} />
          <Stack.Screen name="Comprobante" component={ComprobanteScreen} options={{ presentation: 'modal', title: 'Comprobante' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
      <Stack.Screen name="Ajustes" component={AjustesScreen} options={{ presentation: 'modal', title: 'Ajustes' }} />
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Navegacion />
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  )
}
