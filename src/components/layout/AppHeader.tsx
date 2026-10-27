import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { useTenantTheme, useFeatures } from '../../tenant'
import { useXp, hourLabel } from '../../xp'

const slabLogo = require('../../../assets/slab-logo-thermal.png')

interface AppHeaderProps {
  onMenuPress: () => void
  onProfilePress: () => void
}

export default function AppHeader({ onMenuPress, onProfilePress }: AppHeaderProps) {
  const { profile } = useAuth()
  const theme = useTenantTheme()
  const features = useFeatures()
  const { totalXp, streakDays, streakMult, powerHourActive } = useXp()

  const displayName = profile?.display_name || profile?.full_name
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const { colors } = theme

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.header, borderBottomColor: colors.accentLine },
      ]}
    >
      <View style={styles.content}>
        {/* Hamburger — three explicit white bars */}
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.hamburger}>
            <View style={[styles.bar, { backgroundColor: colors.text }]} />
            <View style={[styles.bar, { backgroundColor: colors.text }]} />
            <View style={[styles.bar, { backgroundColor: colors.text }]} />
          </View>
        </TouchableOpacity>

        {/* Center: tenant wordmark or logo if available, else SLAB logo */}
        {theme.wordmarkUrl || theme.logoUrl ? (
          <Image
            source={{ uri: (theme.wordmarkUrl || theme.logoUrl)! }}
            style={styles.companyLogo}
            resizeMode="contain"
          />
        ) : (
          <Image source={slabLogo} style={styles.logo} resizeMode="contain" />
        )}

        <View style={styles.right}>
          {/* Streak */}
          <View style={[styles.chip, { borderColor: colors.accentLine }]}>
            <Text style={styles.chipIcon}>{'\u{1F9EA}'}</Text>
            <Text style={[styles.chipText, { color: colors.text }]}>{streakDays}</Text>
            {streakMult > 1 && (
              <Text style={[styles.chipMult, { color: colors.accent }]}>{streakMult}x</Text>
            )}
          </View>

          {/* XP */}
          <View style={[styles.chip, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.chipText, { color: colors.accent }]}>
              {totalXp.toLocaleString()} XP
            </Text>
          </View>

          {/* Profile avatar */}
          <TouchableOpacity
            onPress={onProfilePress}
            style={[styles.avatar, { backgroundColor: colors.accent }]}
          >
            {profile?.profile_picture_url ? (
              <Image source={{ uri: profile.profile_picture_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.onAccent }]}>{initials}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {powerHourActive && (
        <View style={[styles.powerBar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.powerText, { color: colors.onAccent }]}>
            {'\u26A1'} POWER HOUR {'\u00B7'} {features.powerHour.multiplier}x XP until{' '}
            {hourLabel((features.powerHour.startHour + 1) % 24)}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomWidth: 1,
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
    borderRadius: 1,
  },
  logo: {
    width: 40,
    height: 40,
  },
  companyLogo: {
    height: 32,
    width: 110,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    height: 28,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  chipMult: {
    fontSize: 11,
    fontWeight: '800',
  },
  powerBar: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  powerText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 14,
    fontWeight: '700',
  },
})
