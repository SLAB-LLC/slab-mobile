import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'
import { getStreak, StreakData } from '../services/streak.service'
import { getUserCompanyRank, getWeekActivityDays, getPersonalWeeklyStats, getPersonalMonthlyStats, getPersonalLifetimeTotals, DailyUsageStat } from '../services/stats.service'
import WelcomeMessage from '../components/home/WelcomeMessage'
import StreakDisplay from '../components/home/StreakDisplay'
import CompanyRank from '../components/home/CompanyRank'
import UsageStats from '../components/home/UsageStats'
import { colors } from '../theme/tokens'

const logoImage = require('../../assets/slab-logo-thermal.png')

export default function HomeScreen() {
  const { user, profile, company } = useAuth()
  const navigation = useNavigation<any>()

  const [streak, setStreak] = useState<StreakData | null>(null)
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null)
  const [activityDays, setActivityDays] = useState<number[]>([])
  const [weeklyStats, setWeeklyStats] = useState<DailyUsageStat[]>([])
  const [monthlyStats, setMonthlyStats] = useState<DailyUsageStat[]>([])
  const [lifetimeTotals, setLifetimeTotals] = useState<{ total_active_minutes: number; transcript_views: number }>({ total_active_minutes: 0, transcript_views: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user?.id) return

    try {
      const [streakData, weekDays, rankData, personalStats, monthStats, lifetimeTots] = await Promise.all([
        getStreak(user.id),
        getWeekActivityDays(user.id),
        company?.id ? getUserCompanyRank(user.id, company.id) : null,
        getPersonalWeeklyStats(user.id),
        getPersonalMonthlyStats(user.id),
        getPersonalLifetimeTotals(user.id),
      ])

      setStreak(streakData)
      setActivityDays(weekDays)
      setRank(rankData)
      setWeeklyStats(personalStats)
      setMonthlyStats(monthStats)
      setLifetimeTotals(lifetimeTots)
    } catch (err) {
      console.error('Error fetching home data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.id, company?.id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const primaryColor = company?.primary_color || '#001199'
  const secondaryColor = company?.secondary_color || '#0a1a5f'
  const firstName = (profile?.display_name || profile?.full_name)?.split(' ')[0] || 'there'

  if (loading) {
    return (
      <LinearGradient
        colors={['#000033', primaryColor, secondaryColor]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={colors.successGold} />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={['#000033', primaryColor, secondaryColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.successGold}
          />
        }
      >
        {/* Company branding */}
        <View style={styles.brandingRow}>
          <Image source={logoImage} style={styles.companyLogo} resizeMode="contain" />
          {company && (
            <Text style={styles.companyName}>{company.name}</Text>
          )}
        </View>

        {/* Welcome message */}
        <WelcomeMessage name={firstName} />

        {/* Streak */}
        <View style={styles.section}>
          <StreakDisplay
            currentStreak={streak?.current_streak || 0}
            longestStreak={streak?.longest_streak || 0}
            activityDays={activityDays}
          />
        </View>

        {/* Company rank */}
        {rank && (
          <View style={styles.section}>
            <CompanyRank
              rank={rank.rank}
              total={rank.total}
              onPress={() => navigation.navigate('Leaderboard')}
            />
          </View>
        )}

        {/* Usage stats */}
        <View style={styles.section}>
          <UsageStats
            weeklyStats={weeklyStats}
            monthlyStats={monthlyStats}
            lifetimeTotals={lifetimeTotals}
            totalActivities={streak?.total_activities || 0}
            currentStreak={streak?.current_streak || 0}
            longestStreak={streak?.longest_streak || 0}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  companyLogo: {
    width: 40,
    height: 40,
  },
  companyName: {
    color: '#f39c12',
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    marginTop: 16,
  },
})
