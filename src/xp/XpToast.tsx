import React, { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet, Platform } from 'react-native'
import { useTenantTheme } from '../tenant'

export interface ToastItem {
  id: number
  text: string
}

/** Pill that drops in under the header, holds, then fades */
export default function XpToast({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  const { colors } = useTenantTheme()
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    anim.setValue(0)
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.delay(1400),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(({ finished }) => finished && onDone())
  }, [toast.id])

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          backgroundColor: colors.header,
          borderColor: colors.accent,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.accent }]}>{'⚡'} {toast.text}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 1000,
    elevation: 10,
  },
  text: { fontSize: 14, fontWeight: '800' },
})
