import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { colors } from '../../theme/tokens'

const slabLogo = require('../../../assets/slab-logo-thermal.png')

interface AppHeaderProps {
  onMenuPress: () => void
  onProfilePress: () => void
}

export default function AppHeader({ onMenuPress, onProfilePress }: AppHeaderProps) {
  const { profile, company } = useAuth()

  const displayName = profile?.display_name || profile?.full_name
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const bgColor = company?.secondary_color || '#0a1a5f'

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        {/* Hamburger — three explicit white bars */}
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.hamburger}>
            <View style={styles.bar} />
            <View style={styles.bar} />
            <View style={styles.bar} />
          </View>
        </TouchableOpacity>

        {/* Center: company logo if available, else SLAB logo */}
        {company?.logo_url ? (
          <Image
            source={{ uri: company.logo_url }}
            style={styles.companyLogo}
            resizeMode="contain"
          />
        ) : (
          <Image source={slabLogo} style={styles.logo} resizeMode="contain" />
        )}

        {/* Profile avatar */}
        <TouchableOpacity onPress={onProfilePress} style={styles.avatar}>
          {profile?.profile_picture_url ? (
            <Image source={{ uri: profile.profile_picture_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 156, 18, 0.2)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburger: {
    width: 24,
    gap: 5,
    alignItems: 'stretch',
  },
  bar: {
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  logo: {
    width: 48,
    height: 48,
  },
  companyLogo: {
    height: 40,
    width: 160,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successGold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
})
