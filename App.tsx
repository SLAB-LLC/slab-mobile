import { StatusBar } from 'expo-status-bar'
import { PaperProvider } from 'react-native-paper'
import AppNavigator from './src/navigation/AppNavigator'
import { AuthProvider } from './src/context/AuthContext'
import ErrorBoundary from './src/components/common/ErrorBoundary'
import { theme } from './src/theme'

export default function App() {
  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </PaperProvider>
    </ErrorBoundary>
  )
}
