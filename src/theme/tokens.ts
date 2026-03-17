/**
 * Design Tokens
 * Single source of truth for spacing, typography, colors, and shadows
 */

export const colors = {
  // Brand colors
  primary: '#D4AF37',
  primaryLight: '#E5C158',
  primaryDark: '#B8972F',

  // Web brand colors
  midnightBlue: '#2c3e50',
  successGold: '#f39c12',
  steelGray: '#34495e',
  charcoal: '#1a1a1a',
  white: '#FFFFFF',

  // Grayscale
  gray900: '#111827',
  gray800: '#1F2937',
  gray700: '#374151',
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  gray50: '#F9FAFB',

  // Semantic colors
  background: '#F3F4F6',
  surface: '#FFFFFF',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',

  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
}

// Category colors for conversation types
export const categoryColors = {
  interaction: { bg: '#DBEAFE', text: '#1E40AF', active: '#2563EB' },
  pitch: { bg: '#FEF3C7', text: '#92400E', active: '#D97706' },
  sale: { bg: '#D1FAE5', text: '#065F46', active: '#059669' },
}

// Objection badge colors
export const objectionColors: Record<string, { bg: string; text: string }> = {
  diy: { bg: '#DBEAFE', text: '#1E40AF' },
  spouse: { bg: '#EDE9FE', text: '#5B21B6' },
  price: { bg: '#FEE2E2', text: '#991B1B' },
  competitor: { bg: '#FFEDD5', text: '#9A3412' },
  delay: { bg: '#FEF3C7', text: '#92400E' },
  not_interested: { bg: '#F3F4F6', text: '#374151' },
  no_problem: { bg: '#D1FAE5', text: '#065F46' },
  no_soliciting: { bg: '#FCE7F3', text: '#9D174D' },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 36,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    color: colors.textPrimary,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: colors.textOnPrimary,
  },
}

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
}

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}
