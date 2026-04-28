import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import {
  NavigationContainer,
  useNavigation,
  createNavigationContainerRef,
} from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs'
import * as Notifications from 'expo-notifications'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList, MainTabParamList } from '../types'
import { hasAcceptedCurrentTos } from '../services/tos.service'
import TosAcceptanceModal from '../components/onboarding/TosAcceptanceModal'
import NotificationPromptModal from '../components/onboarding/NotificationPromptModal'
import { useNotificationPrompt } from '../hooks/useNotificationPrompt'
import BroadcastDetailScreen from '../screens/BroadcastDetailScreen'

// Screens
import LandingScreen from '../screens/LandingScreen'
import LoginScreen from '../screens/LoginScreen'
import HomeScreen from '../screens/HomeScreen'
import LeaderboardScreen from '../screens/LeaderboardScreen'
import AudioHomeScreen from '../screens/AudioHomeScreen'
import MemberProfileScreen from '../screens/MemberProfileScreen'
import HighlightsScreen from '../screens/HighlightsScreen'
import SecretsScreen from '../screens/SecretsScreen'
import FavoritesScreen from '../screens/FavoritesScreen'
import ObjectionsScreen from '../screens/ObjectionsScreen'
import TrendingScreen from '../screens/TrendingScreen'
import TranscriptDetailScreen from '../screens/TranscriptDetailScreen'
import ChannelListScreen from '../screens/ChannelListScreen'
import ChatRoomScreen from '../screens/ChatRoomScreen'
import TrainingVideosScreen from '../screens/TrainingVideosScreen'
import ProfileScreen from '../screens/ProfileScreen'
import RecordAudioScreen from '../screens/RecordAudioScreen'
import SupportScreen from '../screens/SupportScreen'
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen'
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen'

// Layout
import AppHeader from '../components/layout/AppHeader'
import SideDrawer from '../components/layout/SideDrawer'

import { colors } from '../theme/tokens'

const RootStack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()
const InnerStack = createNativeStackNavigator()
const HomeStack = createNativeStackNavigator()
const AudioStack = createNativeStackNavigator()
const ChatStack = createNativeStackNavigator()

// Used to navigate from notification tap handlers (which run outside React tree)
const navigationRef = createNavigationContainerRef<RootStackParamList>()

/**
 * If the notification payload contains a broadcast id, navigate to it.
 * Falls back gracefully when nav is not yet ready or the payload is unrelated.
 */
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined
  const broadcastId = data?.broadcast_id
  if (typeof broadcastId !== 'string' || !broadcastId) return
  if (!navigationRef.isReady()) return
  navigationRef.navigate('BroadcastDetail', { id: broadcastId })
}

// Shared back-header style — dark bg matching the gradient, no title, "Back" label
const BACK_HEADER = {
  headerShown: true,
  title: '',
  headerBackTitle: 'Back',
  headerStyle: { backgroundColor: '#000033' },
  headerTintColor: '#ffffff',
  headerShadowVisible: false,
} as const

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Leaderboard" component={LeaderboardScreen} options={BACK_HEADER} />
    </HomeStack.Navigator>
  )
}

function AudioStackScreen() {
  return (
    <AudioStack.Navigator screenOptions={{ headerShown: false }}>
      <AudioStack.Screen name="AudioHome" component={AudioHomeScreen} />
      <AudioStack.Screen name="MemberProfile" component={MemberProfileScreen} />
      <AudioStack.Screen name="Highlights" component={HighlightsScreen} options={BACK_HEADER} />
      <AudioStack.Screen name="Secrets" component={SecretsScreen} options={{ headerShown: false }} />
      <AudioStack.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: false }} />
      <AudioStack.Screen name="Objections" component={ObjectionsScreen} options={BACK_HEADER} />
      <AudioStack.Screen name="Trending" component={TrendingScreen} options={BACK_HEADER} />
    </AudioStack.Navigator>
  )
}

function ChatStackScreen() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChannelList" component={ChannelListScreen} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} options={BACK_HEADER} />
    </ChatStack.Navigator>
  )
}

// ─── Tab icons ────────────────────────────────────────────────
const TAB_ICONS: Record<string, string> = {
  Home: '\u{1F3E0}',
  Audios: '\u{1F3A7}',
  Chat: '\u{1F4AC}',
  Videos: '\u{1F3AC}',
}

// ─── Custom solid tab bar ──────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { company } = useAuth()
  const barColor = company?.secondary_color || '#0a1a5f'

  return (
    <View style={[tabStyles.container, { backgroundColor: barColor }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index
        const isLast = index === state.routes.length - 1
        return (
          <React.Fragment key={route.key}>
            <TouchableOpacity
              style={tabStyles.tab}
              onPress={() => {
                if (!focused) navigation.navigate(route.name)
              }}
              activeOpacity={0.7}
            >
              {/* Gold indicator bar at top for active tab */}
              <View style={[tabStyles.indicator, focused && tabStyles.indicatorActive]} />
              <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>
                {TAB_ICONS[route.name] || '?'}
              </Text>
              <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>
                {route.name}
              </Text>
            </TouchableOpacity>
            {!isLast && <View style={tabStyles.divider} />}
          </React.Fragment>
        )
      })}
    </View>
  )
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 6,
    paddingBottom: 6,
    gap: 3,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: colors.successGold,
  },
  divider: {
    width: 1,
    marginVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  labelActive: {
    color: '#fff',
  },
})

// ─── Bottom Tabs (needs to be inside InnerStack so useNavigation works) ───
function BottomTabs({ onMenuPress }: { onMenuPress: () => void }) {
  const navigation = useNavigation<any>()

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        header: () => (
          <AppHeader
            onMenuPress={onMenuPress}
            onProfilePress={() => navigation.navigate('Profile')}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Audios" component={AudioStackScreen} />
      <Tab.Screen name="Chat" component={ChatStackScreen} />
      <Tab.Screen name="Videos" component={TrainingVideosScreen} />
    </Tab.Navigator>
  )
}

// ─── Authenticated shell with custom drawer ────────────────────
function AuthenticatedShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigation = useNavigation<any>()

  const handleDrawerNavigate = useCallback((screen: string) => {
    navigation.navigate(screen)
  }, [navigation])

  return (
    <View style={{ flex: 1 }}>
      <InnerStack.Navigator screenOptions={{ headerShown: false }}>
        <InnerStack.Screen name="HomeTabs">
          {() => <BottomTabs onMenuPress={() => setDrawerOpen(true)} />}
        </InnerStack.Screen>
      </InnerStack.Navigator>

      <SideDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleDrawerNavigate}
      />
    </View>
  )
}

// ─── Root Navigator ────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth()

  // TOS acceptance gate — blocks app once user is authenticated.
  // null = checking, true = already accepted, false = needs to accept
  const [tosAccepted, setTosAccepted] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user?.id) {
      setTosAccepted(null)
      return
    }
    let cancelled = false
    hasAcceptedCurrentTos(user.id)
      .then((accepted) => {
        if (!cancelled) setTosAccepted(accepted)
      })
      .catch(() => {
        // If the check fails (e.g., offline), default to NOT accepted so we re-prompt
        if (!cancelled) setTosAccepted(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Notification permission prompt — runs only after TOS is accepted
  const promptReady = !!user && tosAccepted === true
  const { shouldShow: showNotifPrompt, dismissForToday, markAccepted: markNotifShown } =
    useNotificationPrompt(promptReady)

  // Notification tap handlers — both for foreground taps and cold-start tap
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse)

    // Cold start: app was launched by tapping a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response)
    })

    return () => sub.remove()
  }, [])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </View>
    )
  }

  // Authenticated but still checking TOS — show spinner to avoid flash
  if (user && tosAccepted === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <RootStack.Screen name="MainDrawer" component={AuthenticatedShell} />
            <RootStack.Screen name="Profile" component={ProfileScreen} options={BACK_HEADER} />
            <RootStack.Screen name="Support" component={SupportScreen} options={BACK_HEADER} />
            <RootStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={BACK_HEADER} />
            <RootStack.Screen
              name="TranscriptDetail"
              component={TranscriptDetailScreen}
              options={{ headerShown: false }}
            />
            <RootStack.Screen name="RecordAudio" component={RecordAudioScreen} options={BACK_HEADER} />
            <RootStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ ...BACK_HEADER, headerBackTitle: 'Back' }} />
            <RootStack.Screen name="BroadcastDetail" component={BroadcastDetailScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <RootStack.Screen name="Landing" component={LandingScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </RootStack.Navigator>

      {/* TOS acceptance gate — blocks app rendering until accepted */}
      {user && tosAccepted === false && (
        <TosAcceptanceModal
          visible
          onAccepted={() => setTosAccepted(true)}
        />
      )}

      {/* Notification permission prompt — only after TOS, only if not granted */}
      {user && tosAccepted === true && showNotifPrompt && (
        <NotificationPromptModal
          visible
          onDismiss={dismissForToday}
          onDone={markNotifShown}
        />
      )}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.midnightBlue,
  },
})
