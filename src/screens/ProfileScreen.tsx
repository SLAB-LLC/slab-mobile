import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../utils/supabase'
import { colors } from '../theme/tokens'

export default function ProfileScreen() {
  const { user, profile, company, loading, signOut, refreshProfile } = useAuth()

  const displayName = profile?.display_name || ''
  const [nameInput, setNameInput] = useState(displayName)
  const [savingName, setSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const initials = displayName
    ? displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const handlePickPhoto = async () => {
    try {
      // Let the picker handle permissions internally — avoids silent failures
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.[0]) return

      const asset = result.assets[0]
      setUploadingPhoto(true)

      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg'
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg'
      const fileName = `${user!.id}-${Date.now()}.${ext}`

      // Read file as base64 via expo-file-system (reliable on all RN platforms)
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      })

      // Convert base64 → Uint8Array for Supabase Storage
      const binaryString = atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, bytes, { upsert: true, contentType: mimeType })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('id', user!.id)

      if (updateError) throw updateError

      await refreshProfile()
      Alert.alert('Success', 'Profile picture updated.')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to upload photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Error', 'Name cannot be empty.')
      return
    }
    setSavingName(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ display_name: nameInput.trim() })
        .eq('id', user!.id)
      if (error) throw error
      await refreshProfile()
      Alert.alert('Success', 'Name updated.')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update name.')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.')
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert('Success', 'Password updated successfully.')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSignOut = () => {
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.successGold} />
      </View>
    )
  }

  const accentColor = company?.primary_color || colors.successGold
  const navyColor = company?.secondary_color || '#0a1a5f'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Profile Photo */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto} style={styles.avatarWrapper}>
          {uploadingPhoto ? (
            <View style={[styles.avatar, { backgroundColor: navyColor }]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : profile?.profile_picture_url ? (
            <Image source={{ uri: profile.profile_picture_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: navyColor }]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={[styles.cameraButton, { backgroundColor: accentColor }]}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.tapHint}>Tap to change photo</Text>
      </View>

      {/* Read-only info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile?.email || user?.email || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>
            {profile?.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'N/A'}
          </Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Company</Text>
          <Text style={styles.infoValue}>{company?.name || 'N/A'}</Text>
        </View>
      </View>

      {/* Change Name */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change Name</Text>
        <TextInput
          style={styles.input}
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Your full name"
          placeholderTextColor="#9ca3af"
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: navyColor }, savingName && styles.buttonDisabled]}
          onPress={handleSaveName}
          disabled={savingName}
        >
          {savingName ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Save Name</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Change Password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: navyColor }, savingPassword && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={savingPassword}
        >
          {savingPassword ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={[styles.button, styles.signOutButton]} onPress={handleSignOut}>
        <Text style={[styles.buttonText, { color: '#EF4444' }]}>Sign Out</Text>
      </TouchableOpacity>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: {
    fontSize: 16,
  },
  tapHint: {
    color: '#6b7280',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 46,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 8,
  },
})
