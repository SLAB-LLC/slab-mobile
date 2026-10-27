import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Linking,
  Platform,
  Image,
  Animated,
  Dimensions,
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { useTenantTheme } from '../../tenant'

const logoImage = require('../../../assets/slab-logo-thermal.png')
const DRAWER_WIDTH = 280
const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface SideDrawerProps {
  visible: boolean
  onClose: () => void
  onNavigate: (screen: string) => void
}

interface DrawerItem {
  label: string
  icon: string | 'instagram'
  screen?: string
  onPress?: () => void
  danger?: boolean
}

function InstagramIcon() {
  return (
    <View style={{
      width: 22, height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: '#E1306C',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <View style={{
        width: 10, height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#E1306C',
      }} />
      <View style={{
        position: 'absolute',
        top: 2, right: 2,
        width: 3, height: 3,
        borderRadius: 1.5,
        backgroundColor: '#E1306C',
      }} />
    </View>
  )
}

export default function SideDrawer({ visible, onClose, onNavigate }: SideDrawerProps) {
  const { profile, company, signOut } = useAuth()
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const overlayAnim = useRef(new Animated.Value(0)).current

  const { colors, cobrand, brandName } = useTenantTheme()

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible])

  const handleSignOut = () => {
    onClose()
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut()
          } catch (error: any) {
            Alert.alert('Error', error.message)
          }
        },
      },
    ])
  }

  const items: DrawerItem[] = [
    { label: 'Profile', icon: '\u{1F464}', screen: 'Profile' },
    { label: 'Support', icon: '\u{1F4AC}', screen: 'Support' },
    { label: 'Notifications', icon: '\u{1F514}', screen: 'NotificationSettings' },
    { label: 'Terms of Service', icon: '\u{1F4CB}', screen: 'TermsOfService' },
    {
      label: 'Instagram',
      icon: 'instagram',
      onPress: () => {
        onClose()
        Linking.openURL('https://www.instagram.com/slab_training/')
      },
    },
    { label: 'Sign Out', icon: '\u{1F6AA}', onPress: handleSignOut, danger: true },
  ]

  if (!visible) return null

  const displayName = profile?.display_name || profile?.full_name

  return (
    <View style={styles.root}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.header }]}>
          {profile?.profile_picture_url ? (
            <Image
              source={{ uri: profile.profile_picture_url }}
              style={[styles.avatarImage, { borderColor: colors.accent }]}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent }]}>
              <Text style={[styles.avatarInitials, { color: colors.onAccent }]}>
                {displayName
                  ? displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  : '?'}
              </Text>
            </View>
          )}
          <Text style={[styles.userName, { color: colors.text }]}>{displayName || 'User'}</Text>
          {company && (
            <Text style={[styles.companyName, { color: colors.accent }]}>
              {cobrand || brandName}
            </Text>
          )}
        </View>

        {/* Menu items */}
        <View style={styles.menu}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, item.danger && styles.menuItemDanger]}
              onPress={() => {
                if (item.onPress) {
                  item.onPress()
                } else if (item.screen) {
                  onClose()
                  onNavigate(item.screen)
                }
              }}
              activeOpacity={0.8}
            >
              {item.icon === 'instagram'
                ? <View style={styles.menuIcon}><InstagramIcon /></View>
                : <Text style={styles.menuIcon}>{item.icon}</Text>
              }
              <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Image source={logoImage} style={styles.footerLogo} resizeMode="contain" />
          <Text style={styles.footerText}>SLAB Voice v1.0</Text>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  companyName: {
    fontSize: 14,
    marginTop: 4,
  },
  menu: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  menuItemDanger: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  menuLabel: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '500',
  },
  menuLabelDanger: {
    color: '#EF4444',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
    gap: 6,
  },
  footerLogo: {
    width: 32,
    height: 32,
    opacity: 0.4,
  },
  footerText: {
    color: 'rgba(0,0,0,0.3)',
    fontSize: 12,
  },
})
