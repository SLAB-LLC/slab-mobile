import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
  RefreshControl,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native'
import { Video, ResizeMode, Audio } from 'expo-av'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../context/AuthContext'
import { useCompanyColors } from '../hooks/useCompanyColors'
import * as trainingService from '../services/training.service'
import { TrainingVideo } from '../types'
import { colors } from '../theme/tokens'
import { supabase } from '../utils/supabase'

export default function TrainingVideosScreen() {
  const { user, profile } = useAuth()
  const { bgGradient } = useCompanyColors()
  const [videos, setVideos] = useState<TrainingVideo[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null)
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.company_id) fetchData()
  }, [profile?.company_id])

  useEffect(() => {
    if (!activeVideoUrl) return
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    }).catch((err) => console.warn('Failed to set audio mode:', err))
  }, [activeVideoUrl])

  const fetchData = async () => {
    if (!profile?.company_id) return
    try {
      const [vids, completions] = await Promise.all([
        trainingService.getTrainingVideos(profile.company_id),
        user?.id ? trainingService.getUserVideoCompletions(user.id) : Promise.resolve([]),
      ])
      setVideos(vids)
      setCompletedIds(new Set(completions.map((c) => c.video_id)))
    } catch (err) {
      console.error('Error fetching videos:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleVideoPress = async (video: TrainingVideo) => {
    if (loadingVideoId) return

    if (video.video_type === 'youtube' && video.youtube_url) {
      try {
        await Linking.openURL(video.youtube_url)
      } catch {
        Alert.alert('Error', 'Could not open YouTube video.')
        return
      }
      trackCompletion(video.id)
      return
    }

    if (video.video_type === 'upload' && video.storage_path) {
      setLoadingVideoId(video.id)
      let signedUrl: string | null = null
      try {
        const { data, error } = await supabase.storage
          .from('training-videos')
          .createSignedUrl(video.storage_path, 3600)
        if (error || !data?.signedUrl) {
          Alert.alert('Error', 'Could not load video. Please try again.')
          return
        }
        signedUrl = data.signedUrl
      } catch {
        Alert.alert('Error', 'Could not load video. Please try again.')
        return
      } finally {
        setLoadingVideoId(null)
      }

      setActiveVideoUrl(signedUrl)
      trackCompletion(video.id)
      return
    }

    Alert.alert('Video Unavailable', 'This video cannot be played at this time.')
  }

  const trackCompletion = async (videoId: string) => {
    if (!user?.id || completedIds.has(videoId)) return
    try {
      await trainingService.markVideoComplete(videoId, user.id)
      setCompletedIds((prev) => new Set([...prev, videoId]))
    } catch (err) {
      console.error('Failed to mark video complete:', err)
    }
  }

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return null
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const renderVideo = ({ item }: { item: TrainingVideo }) => {
    const isCompleted = completedIds.has(item.id)
    const isLoading = loadingVideoId === item.id

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleVideoPress(item)}
        activeOpacity={0.7}
        disabled={loadingVideoId !== null}
      >
        {item.thumbnail_url ? (
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailIcon}>{'\u{1F3AC}'}</Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {item.duration != null && !isLoading && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{'✓'}</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.videoDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.cardFooter}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>
                {item.video_type === 'youtube' ? '▶ YouTube' : '\u{1F4F9} Uploaded'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <LinearGradient colors={bgGradient} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </LinearGradient>
    )
  }

  return (
    <LinearGradient colors={bgGradient} style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderVideo}
        contentContainerStyle={videos.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.successGold}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{'\u{1F3AC}'}</Text>
            <Text style={styles.emptyText}>No training videos</Text>
            <Text style={styles.emptySubtext}>
              Training videos will appear here when added by your company admin
            </Text>
          </View>
        }
      />

      <Modal
        visible={activeVideoUrl !== null}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setActiveVideoUrl(null)}
      >
        <SafeAreaView style={styles.videoModal}>
          <View style={styles.videoModalHeader}>
            <TouchableOpacity onPress={() => setActiveVideoUrl(null)} style={styles.closeButton}>
              <Text style={styles.closeText}>✕  Close</Text>
            </TouchableOpacity>
          </View>
          {activeVideoUrl && (
            <Video
              source={{ uri: activeVideoUrl }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          )}
        </SafeAreaView>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  emptyList: { flexGrow: 1 },

  card: {
    backgroundColor: 'rgba(0, 17, 85, 0.6)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(0, 17, 85, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailIcon: {
    fontSize: 48,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10B981',
    borderRadius: 16,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  cardContent: {
    padding: 14,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  videoDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
  },

  videoModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoPlayer: {
    width: '100%',
    flex: 1,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    color: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
})
