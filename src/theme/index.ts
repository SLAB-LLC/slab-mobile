import { MD3LightTheme } from 'react-native-paper'

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#D4AF37',        // Brand gold/brass
    secondary: '#111827',      // Dark gray
    tertiary: '#6B7280',       // Medium gray
    background: '#F3F4F6',     // Light background
    surface: '#FFFFFF',        // Card/surface background
    surfaceVariant: '#F3F4F6', // Alternate surface
    error: '#EF4444',          // Error/danger red
    onPrimary: '#FFFFFF',      // Text on primary color
    onSecondary: '#FFFFFF',    // Text on secondary color
    onSurface: '#111827',      // Text on surface
    onBackground: '#111827',   // Text on background
    outline: '#E5E7EB',        // Border color
  },
  roundness: 8,                // Border radius for components
}

// Type export for use in components
export type AppTheme = typeof theme
