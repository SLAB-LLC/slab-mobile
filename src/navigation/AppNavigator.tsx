import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  SafeAreaView,
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
import VaultScreen from '../screens/VaultScreen'
import AskCoachScreen from '../screens/AskCoachScreen'
import LibraryScreen from '../screens/LibraryScreen'
import TranscriptDetailScreen from '../screens/TranscriptDetailScreen'
import TrainingVideosScreen from '../screens/TrainingVideosScreen'
import ProfileScreen from '../screens/ProfileScreen'
import SupportScreen from '../screens/SupportScreen'
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen'
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen'
import LockerScreen, { RepBuilder } from '../screens/LockerScreen'
import GameScreen from '../game/GameScreen'

// Layout
import AppHeader from '../components/layout/AppHeader'
import SideDrawer from '../components/layout/SideDrawer'

import { useTenantTheme, useLabels } from '../tenant'
import { useMyLook } from '../avatar'
import type { TabKey, TenantTheme } from '../tenant'

const RootStack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()
const InnerStack = createNativeStackNavigator()

// Used to navigate from notification tap handlers (which run outside React tree)
const navigationRef = createNavigationContainerRef<RootStackParamList>()

/**
 * Route a tapped notification to the appropriate screen based on its data
 * payload. Currently handles broadcast notifications. No-op when
 * navigation is not yet ready or the payload is unrelated.
 */
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined
  if (!data || !navigationRef.isReady()) return

  const broadcastId = data.broadcast_id
  if (typeof broadcastId === 'string' && broadcastId) {
    navigationRef.navigate('BroadcastDetail', { id: broadcastId })
  }
}

// Shared back-header style — background matching the tenant theme, no title, "Back" label
function backHeader(theme: TenantTheme) {
  return {
    headerShown: true,
    title: '',
    headerBackTitle: 'Back',
    headerStyle: { backgroundColor: theme.colors.background },
    headerTintColor: theme.colors.text,
    headerShadowVisible: false,
  } as const
}

/** Back-header options for the current tenant */
function useBackHeader() {
  const theme = useTenantTheme()
  return React.useMemo(() => backHeader(theme), [theme])
}

// ─── Tab icons and label keys ─────────────────────────────────
const TAB_LABEL_KEYS: Record<keyof MainTabParamList, TabKey> = {
  Lab: 'lab',
  Vault: 'vault',
  Chat: 'chat',
  Leaderboard: 'leaderboard',
  Library: 'library',
}

const TAB_ICONS: Record<keyof MainTabParamList, string> = {
  Lab: '\u{1F9EA}',
  Vault: '\u{1F512}',
  Chat: '\u{1F4AC}',
  Leaderboard: '\u{1F3C6}',
  Library: '\u{1F4DA}',
}

// ─── Custom solid tab bar ──────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTenantTheme()
  const labels = useLabels()

  return (
    <View style={[tabStyles.container, { backgroundColor: colors.tabBar }]}>
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
              <View
                style={[tabStyles.indicator, focused && { backgroundColor: colors.accent }]}
              />
              <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>
                {TAB_ICONS[route.name as keyof MainTabParamList] || '?'}
              </Text>
              <Text
                style={[
                  tabStyles.label,
                  { color: focused ? colors.text : colors.textMuted },
                ]}
              >
                {labels.tabs[TAB_LABEL_KEYS[route.name as keyof MainTabParamList]] ?? route.name}
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
      <Tab.Screen name="Lab" component={TrainingVideosScreen} />
      <Tab.Screen name="Vault" component={VaultScreen} />
      <Tab.Screen name="Chat" component={AskCoachScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
    </Tab.Navigator>
  )
}

// ─── Authenticated shell with custom drawer ────────────────────
function AuthenticatedShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigation = useNavigation<any>()
  const { appStyle } = useTenantTheme()

  const handleDrawerNavigate = useCallback((screen: string) => {
    navigation.navigate(screen)
  }, [navigation])

  // Game-style companies get the full Lab experience (the demo, in a web view)
  if (appStyle === 'game') return <GameScreen />

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
  const theme = useTenantTheme()
  const backHeaderOptions = useBackHeader()
  const { hasLook } = useMyLook()

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
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    )
  }

  // Authenticated but still checking TOS — show spinner to avoid flash
  if (user && tosAccepted === null) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    )
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <RootStack.Screen name="MainDrawer" component={AuthenticatedShell} />
            <RootStack.Screen name="Profile" component={ProfileScreen} options={backHeaderOptions} />
            <RootStack.Screen name="Support" component={SupportScreen} options={backHeaderOptions} />
            <RootStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={backHeaderOptions} />
            <RootStack.Screen name="MyStats" component={HomeScreen} options={backHeaderOptions} />
            <RootStack.Screen name="Locker" component={LockerScreen} options={backHeaderOptions} />
            <RootStack.Screen
              name="TranscriptDetail"
              component={TranscriptDetailScreen}
              options={{ headerShown: false }}
            />
            <RootStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ ...backHeaderOptions, headerBackTitle: 'Back' }} />
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

      {/* First run: build a pixel rep before anything else (after TOS) */}
      {user && tosAccepted === true && hasLook === false && theme.appStyle !== 'game' && (
        <Modal visible animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <RepBuilder firstRun />
          </SafeAreaView>
        </Modal>
      )}

      {/* Notification permission prompt — only after TOS and the rep, only if not granted */}
      {user && tosAccepted === true && hasLook !== false && showNotifPrompt && (
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
  },
})
