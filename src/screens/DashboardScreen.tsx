import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { FAB, Searchbar, Menu, Chip } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'
import * as transcriptsService from '../services/transcripts.service'
import { RootStackParamList, Transcript } from '../types'
import ScreenHeader from '../components/common/ScreenHeader'
import TranscriptCard from '../components/transcripts/TranscriptCard'
import EmptyState from '../components/common/EmptyState'
import { colors, spacing } from '../theme/tokens'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user, profile } = useAuth()
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | null>(null)
  const [menuVisible, setMenuVisible] = useState(false)

  // Pagination state
  const [displayCount, setDisplayCount] = useState(20)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchTranscripts = async () => {
    try {
      // Fetch transcripts based on user subscriptions and assignments
      if (!user?.id) {
        console.warn('No user ID available')
        setTranscripts([])
        return
      }

      const data = await transcriptsService.getTranscripts(user.id)
      setTranscripts(data)
    } catch (error) {
      console.error('Error fetching transcripts:', error)
      setTranscripts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchTranscripts()
    }
  }, [user?.id])

  // Get unique salespeople for filter dropdown
  const uniqueSalespeople = useMemo(() => {
    const names = transcripts
      .map((t) => t.salesperson_name)
      .filter((name): name is string => !!name)
    return [...new Set(names)].sort()
  }, [transcripts])

  // Filter and search transcripts
  const filteredTranscripts = useMemo(() => {
    let filtered = transcripts

    // Apply salesperson filter
    if (selectedSalesperson) {
      filtered = filtered.filter((t) => t.salesperson_name === selectedSalesperson)
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.salesperson_name?.toLowerCase().includes(query) ||
          t.original_filename?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [transcripts, selectedSalesperson, searchQuery])

  // Paginated transcripts (infinite scroll)
  const displayedTranscripts = useMemo(() => {
    return filteredTranscripts.slice(0, displayCount)
  }, [filteredTranscripts, displayCount])

  const onRefresh = () => {
    setRefreshing(true)
    setDisplayCount(20) // Reset pagination on refresh
    fetchTranscripts()
  }

  const handleLoadMore = () => {
    if (loadingMore || displayedTranscripts.length >= filteredTranscripts.length) {
      return
    }

    setLoadingMore(true)
    setTimeout(() => {
      setDisplayCount((prev) => prev + 20)
      setLoadingMore(false)
    }, 500)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedSalesperson(null)
    setDisplayCount(20)
  }

  const renderTranscript = ({ item }: { item: Transcript }) => (
    <TranscriptCard
      transcript={item}
      onPress={() => navigation.navigate('TranscriptDetail', { id: item.id })}
    />
  )

  const renderFooter = () => {
    if (!loadingMore) return null
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const hasActiveFilters = searchQuery.trim() || selectedSalesperson

  return (
    <View style={styles.container}>
      <ScreenHeader title="Transcripts" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search transcripts..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          iconColor={colors.primary}
        />
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Chip
              icon="filter"
              onPress={() => setMenuVisible(true)}
              style={styles.filterChip}
              textStyle={styles.filterChipText}
            >
              {selectedSalesperson || 'Filter by Salesperson'}
            </Chip>
          }
        >
          <Menu.Item
            onPress={() => {
              setSelectedSalesperson(null)
              setMenuVisible(false)
            }}
            title="All Salespeople"
          />
          {uniqueSalespeople.map((name) => (
            <Menu.Item
              key={name}
              onPress={() => {
                setSelectedSalesperson(name)
                setMenuVisible(false)
              }}
              title={name}
            />
          ))}
        </Menu>

        {hasActiveFilters && (
          <Chip
            icon="close"
            onPress={handleClearFilters}
            style={styles.clearChip}
            textStyle={styles.clearChipText}
          >
            Clear Filters
          </Chip>
        )}

        {hasActiveFilters && (
          <Text style={styles.resultCount}>
            {filteredTranscripts.length} result{filteredTranscripts.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Transcripts List */}
      <FlatList
        data={displayedTranscripts}
        renderItem={renderTranscript}
        keyExtractor={(item) => item.id}
        contentContainerStyle={displayedTranscripts.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={styles.emptyIcon}>🎙️</Text>}
            title={hasActiveFilters ? 'No matches found' : 'No transcripts yet'}
            message={
              hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Subscribe to salespeople on the web app to see their transcripts here'
            }
          />
        }
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      <FAB
        icon="microphone"
        style={styles.fab}
        color={colors.textOnPrimary}
        onPress={() => navigation.navigate('RecordAudio')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
  },
  searchbar: {
    backgroundColor: colors.background,
    elevation: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.background,
  },
  filterChipText: {
    color: colors.primary,
  },
  clearChip: {
    backgroundColor: colors.error,
  },
  clearChipText: {
    color: colors.textOnPrimary,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  list: {
    padding: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyIcon: {
    fontSize: 64,
  },
  footerLoader: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
})
