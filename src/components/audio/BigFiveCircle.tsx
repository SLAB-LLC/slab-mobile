import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import type { BigFiveMember } from '../../services/bigfive.service'

interface BigFiveCircleProps {
  member: BigFiveMember
  isSubscribed: boolean
  isLocked: boolean  // Show "Coming Soon" overlay if user only has 1 sub and this isn't it
  onPress: () => void
}

export default function BigFiveCircle({ member, isSubscribed, isLocked, onPress }: BigFiveCircleProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isLocked}
    >
      <View style={[styles.circle, isSubscribed && styles.circleSubscribed]}>
        {member.profile_picture_url ? (
          <Image
            source={{ uri: member.profile_picture_url }}
            style={styles.image}
          />
        ) : (
          <Text style={styles.placeholder}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        )}

        {isLocked && (
          <View style={styles.lockedOverlay}>
            <Text style={styles.lockedText}>{'\u{1F512}'}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.name, isLocked && styles.nameLocked]} numberOfLines={2}>
        {member.name}
      </Text>

      {isSubscribed && (
        <View style={styles.subscribedBadge}>
          <Text style={styles.subscribedBadgeText}>{'\u2713'}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 114,
  },
  circle: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: 'rgba(0, 17, 85, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleSubscribed: {
    borderColor: '#f39c12',
    borderWidth: 3,
    shadowColor: '#f39c12',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 51,
  },
  placeholder: {
    fontSize: 38,
    fontWeight: '800',
    color: '#f39c12',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 51,
  },
  lockedText: {
    fontSize: 22,
  },
  name: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  nameLocked: {
    opacity: 0.4,
  },
  subscribedBadge: {
    position: 'absolute',
    top: -2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f39c12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribedBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
})
