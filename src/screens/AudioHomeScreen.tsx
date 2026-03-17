import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import {
  getBigFiveMembers,
  getUserSubscriptions,
  BigFiveMember,
} from '../services/bigfive.service'
import BigFiveCircle from '../components/audio/BigFiveCircle'
import { colors } from '../theme/tokens'

export default function AudioHomeScreen() {
  const { user, company } = useAuth()
  const navigation = useNavigation<any>()

  const [members, setMembers] = useState<BigFiveMember[]>([])
  const [subscribedIds, setSubscribedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user?.id) return
    try {
      const [membersData, subs] = await Promise.all([
        getBigFiveMembers(),
        getUserSubscriptions(user.id),
      ])
      setMembers(membersData)
      setSubscribedIds(subs)
    } catch (err) {
      console.error('Error fetching audio home data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user?.id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleMemberPress = (member: BigFiveMember) => {
    navigation.navigate('MemberProfile', { memberId: member.id })
  }

  const primaryColor = company?.primary_color || '#001199'

  if (loading) {
    return (
      <LinearGradient colors={['#000033', primaryColor, '#0a1a5f']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </LinearGradient>
    )
  }

  // Split members into rows (3 + 2 layout for 5 members)
  const topRow = members.slice(0, 3)
  const bottomRow = members.slice(3, 5)

  return (
    <LinearGradient
      colors={['#000033', primaryColor, '#0a1a5f']}
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
        {/* Title */}
        <Text style={styles.title}>THE BIG FIVE</Text>
        <Text style={styles.subtitle}>
          Handpicked for their natural abilities to pitch, close, and retain. Learn from the 5 best salesmen in the pest control space.
        </Text>

        {/* Big Five circles */}
        {members.length > 0 ? (
          <View style={styles.circlesSection}>
            {/* Top row */}
            <View style={styles.circleRow}>
              {topRow.map((member) => {
                const isSub = subscribedIds.includes(member.id)
                const isLocked = !member.is_active
                return (
                  <BigFiveCircle
                    key={member.id}
                    member={member}
                    isSubscribed={isSub}
                    isLocked={isLocked}
                    onPress={() => handleMemberPress(member)}
                  />
                )
              })}
            </View>

            {/* Bottom row */}
            {bottomRow.length > 0 && (
              <View style={styles.circleRow}>
                {bottomRow.map((member) => {
                  const isSub = subscribedIds.includes(member.id)
                  const isLocked = !member.is_active
                  return (
                    <BigFiveCircle
                      key={member.id}
                      member={member}
                      isSubscribed={isSub}
                      isLocked={isLocked}
                      onPress={() => handleMemberPress(member)}
                    />
                  )
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyText}>No Big Five members yet.</Text>
            <Text style={styles.emptySubtext}>Check back soon!</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Favorites')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>{'\u2B50'}</Text>
            <Text style={styles.actionLabel}>Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Objections')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>{'\u274C'}</Text>
            <Text style={styles.actionLabel}>Objections</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Trending')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>{'\u{1F525}'}</Text>
            <Text style={styles.actionLabel}>Trending</Text>
          </TouchableOpacity>
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
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: 'rgba(243, 156, 18, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  circlesSection: {
    alignItems: 'center',
    gap: 20,
  },
  circleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 8,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 32,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
})
