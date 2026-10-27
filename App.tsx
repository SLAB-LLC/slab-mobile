import { StatusBar } from 'expo-status-bar'
import { PaperProvider } from 'react-native-paper'
import AppNavigator from './src/navigation/AppNavigator'
import { AuthProvider } from './src/context/AuthContext'
import ErrorBoundary from './src/components/common/ErrorBoundary'
import { TenantProvider, useTenantTheme, buildPaperTheme } from './src/tenant'
import { XpProvider } from './src/xp'
import { AvatarProvider } from './src/avatar'
import { useMemo } from 'react'

/** Everything below the tenant provider paints in the company's theme */
function ThemedApp() {
  const tenantTheme = useTenantTheme()
  const paperTheme = useMemo(() => buildPaperTheme(tenantTheme), [tenantTheme])

  return (
    <PaperProvider theme={paperTheme}>
      <XpProvider>
        <AvatarProvider>
          <AppNavigator />
        </AvatarProvider>
      </XpProvider>
      <StatusBar style={tenantTheme.statusBar} />
    </PaperProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TenantProvider>
          <ThemedApp />
        </TenantProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
