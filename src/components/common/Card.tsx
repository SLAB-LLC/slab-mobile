import React from 'react'
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import { colors, spacing, borderRadius, shadows } from '../../theme/tokens'

interface CardProps {
  children: React.ReactNode
  onPress?: () => void
  style?: ViewStyle
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'small' | 'medium' | 'large'
}

export default function Card({
  children,
  onPress,
  style,
  variant = 'default',
  padding = 'medium',
}: CardProps) {
  const cardStyles = [
    styles.base,
    styles[variant],
    styles[`${padding}Padding`],
    style,
  ]

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    )
  }

  return <View style={cardStyles}>{children}</View>
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },

  // Variants
  default: {
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  elevated: {
    ...shadows.md,
    borderWidth: 0,
  },
  outlined: {
    borderWidth: 2,
    borderColor: colors.gray300,
  },

  // Padding
  nonePadding: {
    padding: 0,
  },
  smallPadding: {
    padding: spacing.sm,
  },
  mediumPadding: {
    padding: spacing.md,
  },
  largePadding: {
    padding: spacing.lg,
  },
})
