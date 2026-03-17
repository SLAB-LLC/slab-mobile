import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import {
  getBigFiveMemberById,
  getMemberAwards,
  getMemberSalespersonNames,
  getUserSubscriptions,
  BigFiveMember,
  BigFiveAward,
} from '../services/bigfive.service'
import { supabase } from '../utils/supabase'
import StatsRow from '../components/audio/StatsRow'
import AwardsSection from '../components/audio/AwardsSection'
import SalesHeatMap from '../components/audio/SalesHeatMap'
import AllRecordingsSection from '../components/audio/AllRecordingsSection'
import {
  getMemberAllRecordings,
  MemberRecording,
} from '../services/bigfive.service'
import { colors } from '../theme/tokens'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const HEADER_HEIGHT = 320

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
        width: 9, height: 9,
        borderRadius: 4.5,
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

interface DayData {
  date: string
  salesCount: number
  conversationCount: number
  areaType?: string
  transcriptId?: string
}

export default function MemberProfileScreen() {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const { memberId } = route.params

  const { user } = useAuth()
  const [member, setMember] = useState<BigFiveMember | null>(null)
  const [awards, setAwards] = useState<BigFiveAward[]>([])
  const [recordings, setRecordings] = useState<MemberRecording[]>([])
  const [calendarData, setCalendarData] = useState<DayData[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const scrollY = useRef(new Animated.Value(0)).current
  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())

  const fetchData = async () => {
    try {
      const [memberData, awardsData, recordingsData, subs] = await Promise.all([
        getBigFiveMemberById(memberId),
        getMemberAwards(memberId),
        getMemberAllRecordings(memberId),
        user?.id ? getUserSubscriptions(user.id) : Promise.resolve([]),
      ])

      setMember(memberData)
      setAwards(awardsData)
      setRecordings(recordingsData)
      setIsSubscribed(subs.includes(memberId))

      // Fetch calendar data — get conversations linked to this member
      if (memberData) {
        await fetchCalendarData(memberId, calYear, calMonth)
      }
    } catch (err) {
      console.error('Error fetching member profile:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchCalendarData = async (mId: string, year: number, month: number) => {
    try {
      // Get salesperson names linked to this member
      const names = await getMemberSalespersonNames(mId)
      if (names.length === 0) {
        setCalendarData([])
        return
      }

      // Get transcripts for these salespeople in this month
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const endDate = `${year}-${String(month + 2 > 12 ? 1 : month + 2).padStart(2, '0')}-01`

      const { data: transcripts, error } = await supabase
        .from('transcripts')
        .select('id, created_at, actual_sales_count, area_type')
        .in('salesperson_name', names)
        .gte('created_at', startDate)
        .lt('created_at', endDate)

      if (error) {
        console.error('Error fetching calendar transcripts:', error)
        setCalendarData([])
        return
      }

      // Get conversation counts per transcript
      const transcriptIds = (transcripts || []).map((t) => t.id)
      let convoCounts: Record<string, number> = {}

      if (transcriptIds.length > 0) {
        const { data: convos } = await supabase
          .from('conversations')
          .select('transcript_id')
          .in('transcript_id', transcriptIds)

        if (convos) {
          convos.forEach((c) => {
            convoCounts[c.transcript_id] = (convoCounts[c.transcript_id] || 0) + 1
          })
        }
      }

      // Aggregate by date
      const dateMap = new Map<string, DayData>()
      ;(transcripts || []).forEach((t) => {
        const date = t.created_at.split('T')[0]
        const existing = dateMap.get(date)
        if (existing) {
          existing.salesCount += t.actual_sales_count || 0
          existing.conversationCount += convoCounts[t.id] || 0
        } else {
          dateMap.set(date, {
            date,
            salesCount: t.actual_sales_count || 0,
            conversationCount: convoCounts[t.id] || 0,
            areaType: t.area_type,
            transcriptId: t.id,
          })
        }
      })

      setCalendarData(Array.from(dateMap.values()))
    } catch (err) {
      console.error('Error fetching calendar data:', err)
      setCalendarData([])
    }
  }

  useEffect(() => {
    fetchData()
  }, [memberId])

  useEffect(() => {
    if (member) {
      fetchCalendarData(memberId, calYear, calMonth)
    }
  }, [calYear, calMonth])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear(calYear - 1)
    } else {
      setCalMonth(calMonth - 1)
    }
  }

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear(calYear + 1)
    } else {
      setCalMonth(calMonth + 1)
    }
  }

  // Parallax effect for the profile image
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, HEADER_HEIGHT * 0.4],
    extrapolate: 'clamp',
  })
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.6],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  })

  if (loading) {
    return (
      <LinearGradient colors={['#000033', '#001199', '#0a1a5f']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </LinearGradient>
    )
  }

  if (!member) {
    return (
      <LinearGradient colors={['#000033', '#001199', '#0a1a5f']} style={styles.loadingContainer}>
        <Text style={{ color: '#fff', fontSize: 16 }}>Member not found</Text>
      </LinearGradient>
    )
  }

  return (
    <View style={styles.container}>
      {/* Fixed background profile image */}
      <Animated.View
        style={[
          styles.headerImage,
          { transform: [{ translateY: imageTranslateY }], opacity: imageOpacity },
        ]}
      >
        {member.profile_picture_url ? (
          <Image
            source={{ uri: member.profile_picture_url }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#000033', '#001199']}
            style={styles.profileImage}
          >
            <Text style={styles.profileInitial}>
              {member.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        {/* Gradient fade at bottom of image */}
        <LinearGradient
          colors={['transparent', '#000033']}
          style={styles.headerFade}
        />
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.successGold} />
        }
      >
        {/* Spacer to push content below image */}
        <View style={{ height: HEADER_HEIGHT - 60 }} />

        {/* Card content */}
        <View style={styles.cardContent}>
          {/* Name */}
          <Text style={styles.memberName}>{member.name}</Text>

          {/* Instagram */}
          {member.instagram_handle && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`https://instagram.com/${member.instagram_handle}`)}
              style={styles.instaRow}
            >
              <InstagramIcon />
              <Text style={styles.instaHandle}>@{member.instagram_handle}</Text>
            </TouchableOpacity>
          )}

          {/* Bio */}
          {member.bio && <Text style={styles.bio}>{member.bio}</Text>}

          {/* Stats */}
          <View style={styles.section}>
            <StatsRow
              bestDay={member.best_day}
              bestSummer={member.best_summer}
              bestWeek={member.best_week}
              retentionPercentage={member.retention_percentage}
            />
          </View>

          {/* Awards */}
          {awards.length > 0 && (
            <View style={styles.section}>
              <AwardsSection awards={awards} />
            </View>
          )}

          {/* All recordings — only visible to subscribers */}
          {isSubscribed ? (
            recordings.length > 0 && (
              <View style={styles.section}>
                <AllRecordingsSection
                  recordings={recordings}
                  onPress={(transcriptId) =>
                    navigation.navigate('TranscriptDetail', { id: transcriptId })
                  }
                />
              </View>
            )
          ) : (
            <View style={[styles.section, styles.lockedRecordings]}>
              <Text style={styles.lockedIcon}>🔒</Text>
              <Text style={styles.lockedTitle}>Recordings Locked</Text>
              <Text style={styles.lockedSubtitle}>Subscribe to this member to access their recordings.</Text>
            </View>
          )}

          {/* Calendar heat map */}
          <View style={styles.section}>
            <View style={styles.calNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>{'\u2039'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                <Text style={styles.calNavText}>{'\u203A'}</Text>
              </TouchableOpacity>
            </View>
            <SalesHeatMap
              year={calYear}
              month={calMonth}
              dayData={calendarData}
            />
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Highlights', { memberId })}
            >
              <Text style={styles.actionBtnIcon}>{'\u{1F3B5}'}</Text>
              <Text style={styles.actionBtnLabel}>Highlights</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnSecrets}
              onPress={() => navigation.navigate('Secrets', { memberId })}
            >
              <Text style={styles.actionBtnIcon}>{'\u{1F510}'}</Text>
              <Text style={styles.actionBtnLabel}>SECRETS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backText}>{'\u2190'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000033',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 0,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 80,
    fontWeight: '800',
    color: '#f39c12',
  },
  headerFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cardContent: {
    backgroundColor: '#000033',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    minHeight: 600,
  },
  memberName: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(243, 156, 18, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  instaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  instaHandle: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '500',
  },
  bio: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  section: {
    marginTop: 20,
  },
  lockedRecordings: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.15)',
  },
  lockedIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  lockedSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  calNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavText: {
    color: '#f39c12',
    fontSize: 24,
    fontWeight: '300',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 17, 85, 0.7)',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  actionBtnSecrets: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
  },
  actionBtnIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionBtnLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
})
