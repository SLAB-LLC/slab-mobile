import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import {
  useAudioRecorder,
  AndroidAudioEncoder,
  AndroidOutputFormat,
  IOSAudioQuality,
  IOSOutputFormat,
} from 'expo-audio'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import * as uploadService from '../services/upload.service'
import RecordButton from '../components/audio/RecordButton'
import RecordingTimer from '../components/audio/RecordingTimer'
import AudioPreview from '../components/audio/AudioPreview'
import Input from '../components/common/Input'
import { colors, spacing, typography } from '../theme/tokens'

type RecordingState = 'idle' | 'recording' | 'preview'

const MAX_DURATION = 600 // 10 minutes in seconds

export default function RecordAudioScreen() {
  const navigation = useNavigation()
  const { user, profile } = useAuth()
  const audioRecorder = useAudioRecorder(
    Platform.OS === 'ios'
      ? {
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          outputFormat: IOSOutputFormat.MPEG4AAC,
          audioQuality: IOSAudioQuality.HIGH,
        }
      : {
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          outputFormat: AndroidOutputFormat.MPEG_4,
          audioEncoder: AndroidAudioEncoder.AAC,
        }
  )

  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [recordingUri, setRecordingUri] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [salespersonName, setSalespersonName] = useState('')
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    requestPermissions()

    return () => {
      // Cleanup on unmount
      if (audioRecorder.isRecording) {
        audioRecorder.stop()
      }
    }
  }, [])

  const requestPermissions = async () => {
    try {
      const granted = await audioRecorder.requestPermissions()
      setPermissionGranted(granted)

      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Microphone access is required to record audio. Please enable it in your device settings.',
          [{ text: 'OK' }]
        )
      }
    } catch (error) {
      console.error('Error requesting permissions:', error)
    }
  }

  const handleRecordPress = async () => {
    if (recordingState === 'idle') {
      await startRecording()
    } else if (recordingState === 'recording') {
      await stopRecording()
    }
  }

  const startRecording = async () => {
    try {
      if (!permissionGranted) {
        await requestPermissions()
        return
      }

      await audioRecorder.record()
      setRecordingState('recording')
    } catch (error) {
      console.error('Failed to start recording:', error)
      Alert.alert('Error', 'Failed to start recording. Please try again.')
    }
  }

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return

    try {
      const uri = await audioRecorder.stop()
      const duration = audioRecorder.duration

      setRecordingUri(uri)
      setRecordingDuration(duration)
      setRecordingState('preview')
    } catch (error) {
      console.error('Failed to stop recording:', error)
      Alert.alert('Error', 'Failed to stop recording')
    }
  }

  const handleReRecord = async () => {
    setRecordingUri(null)
    setRecordingDuration(0)
    setRecordingState('idle')
  }

  const handleUpload = async () => {
    if (!recordingUri) return

    if (!salespersonName.trim()) {
      Alert.alert('Missing Information', 'Please enter the salesperson name')
      return
    }

    if (!user?.id || !profile?.company_id) {
      Alert.alert('Error', 'User information not available')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const result = await uploadService.uploadAudio(
        recordingUri,
        {
          salesperson_name: salespersonName.trim(),
          original_filename: `recording-${Date.now()}.m4a`,
        },
        profile.company_id,
        user.id,
        (progress) => {
          setUploadProgress(progress.progress)
        }
      )

      if (result.success) {
        Alert.alert(
          'Upload Successful',
          'Your recording has been uploaded and will be transcribed shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack()
              },
            },
          ]
        )
      } else {
        Alert.alert('Upload Failed', result.error || 'Failed to upload recording')
        setUploading(false)
      }
    } catch (error) {
      console.error('Upload error:', error)
      Alert.alert('Upload Failed', 'An unexpected error occurred')
      setUploading(false)
    }
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancel Recording',
      'Are you sure you want to cancel? This recording will be lost.',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            setRecordingUri(null)
            setRecordingDuration(0)
            setRecordingState('idle')
            navigation.goBack()
          },
        },
      ]
    )
  }

  const handleTimerTick = (seconds: number) => {
    // Auto-stop at max duration
    if (audioRecorder.isRecording && audioRecorder.duration >= MAX_DURATION) {
      stopRecording()
      Alert.alert(
        'Maximum Duration Reached',
        'Recording stopped at 10 minutes maximum duration.'
      )
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Record Audio</Text>
        <Text style={styles.subtitle}>
          Record a sales call for transcription and analysis
        </Text>

        {/* Salesperson Name Input */}
        <View style={styles.inputContainer}>
          <Input
            label="Salesperson Name"
            placeholder="Enter salesperson name"
            value={salespersonName}
            onChangeText={setSalespersonName}
            editable={recordingState !== 'recording' && !uploading}
          />
        </View>

        {/* Recording Timer */}
        {recordingState === 'recording' && (
          <View style={styles.timerContainer}>
            <RecordingTimer isRecording={true} onTick={handleTimerTick} />
          </View>
        )}

        {/* Recording State UI */}
        {recordingState !== 'preview' ? (
          <View style={styles.recordContainer}>
            <RecordButton
              isRecording={recordingState === 'recording'}
              onPress={handleRecordPress}
              disabled={!permissionGranted || uploading}
            />

            {!permissionGranted && (
              <Text style={styles.warningText}>
                Microphone permission required
              </Text>
            )}

            {recordingState === 'recording' && (
              <Text style={styles.hint}>
                Maximum recording time: {MAX_DURATION / 60} minutes
              </Text>
            )}
          </View>
        ) : (
          // Preview State
          recordingUri && (
            <AudioPreview
              uri={recordingUri}
              duration={recordingDuration}
              onReRecord={handleReRecord}
              onUpload={handleUpload}
              onCancel={handleCancel}
            />
          )
        )}
      </ScrollView>

      {/* Upload Progress Overlay */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.uploadText}>Uploading...</Text>
            <Text style={styles.uploadProgress}>{uploadProgress}%</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  recordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  warningText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadText: {
    ...typography.h4,
    marginTop: spacing.md,
    color: colors.textPrimary,
  },
  uploadProgress: {
    ...typography.h2,
    marginTop: spacing.sm,
    color: colors.primary,
    fontFamily: 'monospace',
  },
})
