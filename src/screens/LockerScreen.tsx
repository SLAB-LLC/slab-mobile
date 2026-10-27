import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import { useTenantTheme } from '../tenant'
import { useXp } from '../xp'
import { PixelSprite, RideIcon, useMyLook, useSpriteEngine } from '../avatar'
import type { GearSlot, RepLook, SpriteCrop } from '../avatar'

type LockerTab = 'skin' | 'hair' | 'face' | GearSlot

const TABS: { key: LockerTab; label: string }[] = [
  { key: 'skin', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'face', label: 'Face' },
  { key: 'top', label: 'Top' },
  { key: 'hat', label: 'Hat' },
  { key: 'pants', label: 'Pants' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'extra', label: 'Extras' },
  { key: 'ride', label: 'Ride' },
]

// Which part of the rep a tile shows for each slot
const TILE_CROP: Record<Exclude<GearSlot, 'ride'>, SpriteCrop> = {
  top: 'torso',
  hat: 'head',
  pants: 'legs',
  shoes: 'legs',
  extra: 'bust',
}

// Tap the preview to cycle through these
const POSES = ['idle', 'crossed', 'win', 'side-0', 'up-0']

interface RepBuilderProps {
  /** First run: the rep has no look yet, so there's no way out but Save */
  firstRun?: boolean
  onSaved?: () => void
}

/**
 * The locker: build a pixel rep and dress them in company gear.
 * Gear opens up as total XP grows; nothing is bought.
 */
export function RepBuilder({ firstRun = false, onSaved }: RepBuilderProps) {
  const { colors, brandName } = useTenantTheme()
  const engine = useSpriteEngine()
  const { totalXp } = useXp()
  const { look: savedLook, saveLook } = useMyLook()

  const [look, setLook] = useState<RepLook>(savedLook)
  const [tab, setTab] = useState<LockerTab>('skin')
  const [poseIndex, setPoseIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  // Pick up the saved look once it arrives from the server
  useEffect(() => setLook(savedLook), [savedLook])

  const dirty = JSON.stringify(look) !== JSON.stringify(savedLook)
  const set = (patch: Partial<RepLook>) => {
    Haptics.selectionAsync().catch(() => {})
    setLook((prev) => ({ ...prev, ...patch }))
  }

  const nextUnlock = useMemo(() => engine.ALL_GEAR.find((g) => g.xp > totalXp), [engine, totalXp])

  const save = async () => {
    setSaving(true)
    try {
      await saveLook(look)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      onSaved?.()
    } catch (err) {
      console.error('Error saving rep look:', err)
      Alert.alert('Could not save', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const swatches = (list: string[], value: number, onPick: (i: number) => void) => (
    <View style={styles.swatches}>
      {list.map((c, i) => (
        <TouchableOpacity
          key={c + i}
          onPress={() => onPick(i)}
          style={[
            styles.swatch,
            { backgroundColor: c, borderColor: i === value ? colors.accent : 'transparent' },
          ]}
        />
      ))}
    </View>
  )

  const tile = (key: string, label: string, active: boolean, lockedAt: number, art: React.ReactNode, onPick: () => void) => {
    const locked = lockedAt > totalXp
    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.tile,
          {
            backgroundColor: active ? colors.accentSoft : colors.surface,
            borderColor: active ? colors.accent : colors.accentLine,
          },
        ]}
        onPress={() => {
          if (locked) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
            Alert.alert(label, `Unlocks at ${lockedAt.toLocaleString()} XP. You have ${totalXp.toLocaleString()}.`)
            return
          }
          onPick()
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.tileArt, locked && styles.locked]}>{art}</View>
        <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={2}>
          {label}
        </Text>
        {locked && (
          <Text style={[styles.tileLock, { color: colors.accent }]}>
            {'\u{1F512}'} {lockedAt.toLocaleString()} XP
          </Text>
        )}
      </TouchableOpacity>
    )
  }

  const sectionLabel = (text: string) => (
    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{text}</Text>
  )

  const renderOptions = () => {
    switch (tab) {
      case 'skin':
        return (
          <>
            {sectionLabel('Skin tone')}
            {swatches(engine.SKINS, look.skin, (skin) => set({ skin }))}
          </>
        )
      case 'hair':
        return (
          <>
            {sectionLabel('Color')}
            {swatches(engine.HAIR_COLORS, look.hairColor, (hairColor) => set({ hairColor }))}
            {sectionLabel('Style')}
            <View style={styles.tiles}>
              {engine.HAIR_STYLES.map((h) =>
                tile(h.id, h.name, look.hair === h.id, 0,
                  <PixelSprite look={{ ...look, hair: h.id, hat: 'none' }} size={64} crop="head" />,
                  () => set({ hair: h.id }))
              )}
            </View>
          </>
        )
      case 'face':
        return (
          <>
            {sectionLabel('Eyes')}
            {swatches(engine.EYE_COLORS, look.eyes, (eyes) => set({ eyes }))}
            {sectionLabel('Facial hair')}
            <View style={styles.tiles}>
              {engine.FACES.map((f) =>
                tile(f.id, f.name, look.face === f.id, 0,
                  <PixelSprite look={{ ...look, face: f.id }} size={64} crop="head" />,
                  () => set({ face: f.id }))
              )}
            </View>
          </>
        )
      case 'ride':
        return (
          <>
            {sectionLabel(`Rides unlock with XP`)}
            <View style={styles.tiles}>
              {engine.GEAR.ride.map((g) =>
                tile(g.id, g.name, look.ride === g.id, g.xp,
                  g.id === 'none' ? (
                    <PixelSprite look={look} size={64} crop="full" />
                  ) : (
                    <RideIcon kind={g.id} size={64} />
                  ),
                  () => set({ ride: g.id }))
              )}
            </View>
          </>
        )
      default: {
        const slot = tab
        return (
          <>
            {sectionLabel(`${brandName} gear unlocks with XP`)}
            <View style={styles.tiles}>
              {engine.GEAR[slot].map((g) =>
                tile(g.id, g.name, look[slot] === g.id, g.xp,
                  <PixelSprite look={{ ...look, [slot]: g.id }} size={64} crop={TILE_CROP[slot]} />,
                  () => set({ [slot]: g.id } as Partial<RepLook>))
              )}
            </View>
          </>
        )
      }
    }
  }

  const pose = POSES[poseIndex % POSES.length]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {firstRun && (
        <View style={styles.intro}>
          <Text style={[styles.introTitle, { color: colors.text }]}>Build your rep</Text>
          <Text style={[styles.introSub, { color: colors.textMuted }]}>
            This is you on the leaderboard and in the Lab. Earn XP to unlock more gear.
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setPoseIndex((i) => i + 1)}
        style={[styles.stage, { backgroundColor: colors.surface, borderColor: colors.accentLine }]}
      >
        <PixelSprite look={look} size={190} pose={pose} withRide={look.ride !== 'none'} />
        <Text style={[styles.stageHint, { color: colors.textMuted }]}>Tap to pose</Text>
      </TouchableOpacity>

      <Text style={[styles.xpLine, { color: colors.textMuted }]}>
        <Text style={{ color: colors.accent, fontWeight: '800' }}>{totalXp.toLocaleString()} XP</Text>
        {nextUnlock
          ? `  ·  next: ${nextUnlock.name} at ${nextUnlock.xp.toLocaleString()}`
          : '  ·  everything unlocked'}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                styles.tab,
                { borderColor: colors.accentLine },
                active && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
            >
              <Text style={[styles.tabText, { color: active ? colors.onAccent : colors.text }]}>{t.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView style={styles.options} contentContainerStyle={styles.optionsContent}>
        {renderOptions()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.accentLine, backgroundColor: colors.header }]}>
        <TouchableOpacity
          onPress={save}
          disabled={saving || (!dirty && !firstRun)}
          style={[
            styles.save,
            { backgroundColor: colors.accent, opacity: saving || (!dirty && !firstRun) ? 0.4 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={[styles.saveText, { color: colors.onAccent }]}>
              {firstRun ? "That's me" : dirty ? 'Save' : 'Saved'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

/** Locker screen opened from the profile or drawer */
export default function LockerScreen() {
  const navigation = useNavigation<any>()
  return <RepBuilder onSaved={() => navigation.goBack()} />
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  intro: { paddingHorizontal: 24, paddingTop: 12, alignItems: 'center' },
  introTitle: { fontSize: 24, fontWeight: '900' },
  introSub: { fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  stage: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
  },
  stageHint: { fontSize: 12, marginTop: 4 },
  xpLine: { fontSize: 13, textAlign: 'center', marginTop: 10 },
  tabsScroll: { flexGrow: 0, marginTop: 10 },
  tabs: { paddingHorizontal: 16, gap: 8 },
  tab: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  tabText: { fontSize: 14, fontWeight: '700' },
  options: { flex: 1 },
  optionsContent: { padding: 16, paddingBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', borderWidth: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  tileArt: { height: 66, justifyContent: 'center' },
  locked: { opacity: 0.3 },
  tileLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  tileLock: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  footer: { padding: 12, paddingBottom: 28, borderTopWidth: 1 },
  save: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontWeight: '800' },
})
