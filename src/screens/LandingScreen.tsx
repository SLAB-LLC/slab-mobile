import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  Platform,
  Pressable,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Video, ResizeMode } from 'expo-av'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Landing'>

const logoVideo = require('../../assets/slab-logo-pan.mp4')
const logoImage = require('../../assets/slab-logo-thermal.png')

interface LetterData {
  letter: string
  word: string
  description: string
  action: 'story' | 'login' | 'admin' | 'buy'
}

const LETTERS: LetterData[] = [
  {
    letter: 'S',
    word: 'Story',
    description: 'Discover the SLAB story and what makes our voice intelligence platform unique.',
    action: 'story',
  },
  {
    letter: 'L',
    word: 'Login',
    description: 'Sign in to your account and access your training.',
    action: 'login',
  },
  {
    letter: 'A',
    word: 'Admin',
    description: 'Administrator access for company management.',
    action: 'admin',
  },
  {
    letter: 'B',
    word: 'Buy',
    description: 'Explore our plans and get started with SLAB Voice.',
    action: 'buy',
  },
]

const goldGlow = {
  textShadowColor: 'rgba(255, 140, 0, 1)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 20,
}

const yellowGlow = {
  textShadowColor: 'rgba(255, 255, 0, 1)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 20,
}

// Seamless infinite ticker — renders two copies of content and loops with Animated.loop
function InfiniteTicker({ direction }: { direction: 1 | -1 }) {
  const tickerAnim = useRef(new Animated.Value(0)).current
  const [tickerWidth, setTickerWidth] = useState(0)

  useEffect(() => {
    if (tickerWidth === 0) return
    const fromVal = direction === 1 ? 0 : -tickerWidth
    const toVal = direction === 1 ? -tickerWidth : 0
    tickerAnim.setValue(fromVal)
    const anim = Animated.loop(
      Animated.timing(tickerAnim, {
        toValue: toVal,
        duration: 15000,
        useNativeDriver: true,
      })
    )
    anim.start()
    return () => anim.stop()
  }, [tickerWidth, direction])

  const renderItems = () =>
    Array.from({ length: 4 }).map((_, i) => (
      <View key={i} style={tickerStyles.item}>
        <Image source={logoImage} style={tickerStyles.logo} resizeMode="contain" />
        <Text style={tickerStyles.text}>  CLICK ON A LETTER TO LEARN MORE  </Text>
      </View>
    ))

  return (
    <View style={tickerStyles.container}>
      <Animated.View style={[tickerStyles.row, { transform: [{ translateX: tickerAnim }] }]}>
        <View
          style={tickerStyles.row}
          onLayout={(e) => {
            if (tickerWidth === 0) setTickerWidth(e.nativeEvent.layout.width)
          }}
        >
          {renderItems()}
        </View>
        <View style={tickerStyles.row}>{renderItems()}</View>
      </Animated.View>
    </View>
  )
}

const tickerStyles = StyleSheet.create({
  container: {
    height: 40,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30,
  },
  logo: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  text: {
    color: '#f39c12',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    textShadowColor: 'rgba(243, 156, 18, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
})

export default function LandingScreen() {
  const navigation = useNavigation<NavigationProp>()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const letterAnims = useRef(LETTERS.map(() => new Animated.Value(0))).current
  const videoRef = useRef<Video>(null)

  const collapseAll = () => {
    if (expandedIndex !== null) {
      Animated.timing(letterAnims[expandedIndex], {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start()
      setExpandedIndex(null)
    }
  }

  const handleLetterPress = (index: number) => {
    if (expandedIndex === index) {
      collapseAll()
      return
    }
    if (expandedIndex !== null) {
      Animated.timing(letterAnims[expandedIndex], {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start()
    }
    setExpandedIndex(index)
    Animated.timing(letterAnims[index], {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }

  const handleLetterAction = (letter: LetterData) => {
    switch (letter.action) {
      case 'login':
      case 'admin':
        navigation.navigate('Login')
        break
    }
  }

  const renderLetterButton = (index: number) => {
    const letter = LETTERS[index]
    const isExpanded = expandedIndex === index
    const isDimmed = expandedIndex !== null && expandedIndex !== index
    return (
      <TouchableOpacity
        key={letter.letter}
        onPress={() => handleLetterPress(index)}
        activeOpacity={0.7}
        style={styles.letterTouchable}
      >
        <View
          style={[
            styles.letterGlowView,
            isExpanded && styles.letterGlowViewExpanded,
            isDimmed && styles.letterGlowViewDimmed,
          ]}
        >
          <Text
            style={[
              styles.letterText,
              isExpanded && styles.letterTextExpanded,
            ]}
          >
            {isExpanded ? letter.word : letter.letter}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderExpandedContent = (letter: LetterData, index: number) => {
    const expandAnim = letterAnims[index]
    const height = expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 180],
    })
    const opacity = expandAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    })
    return (
      <Animated.View style={[styles.expandedContent, { maxHeight: height, opacity }]}>
        <Text style={styles.expandedDescription}>{letter.description}</Text>
        {(letter.action === 'login' || letter.action === 'admin') && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLetterAction(letter)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>
              {letter.action === 'login' ? 'Sign In' : 'Admin Login'}
            </Text>
          </TouchableOpacity>
        )}
        {letter.action === 'story' && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Video Coming Soon</Text>
          </View>
        )}
        {letter.action === 'buy' && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Plans Coming Soon</Text>
          </View>
        )}
      </Animated.View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Radial-style background: medium-dark blue at edges, darkest in center */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0d2480' }]} />
      <LinearGradient
        colors={['rgba(0, 2, 15, 0)', 'rgba(0, 2, 15, 0.93)', 'rgba(0, 2, 15, 0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['rgba(0, 2, 15, 0)', 'rgba(0, 2, 15, 0.72)', 'rgba(0, 2, 15, 0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {expandedIndex !== null && (
        <Pressable style={styles.overlay} onPress={collapseAll} />
      )}

      {/* Top ticker */}
      <View style={{ marginTop: Platform.OS === 'ios' ? 50 : 30, zIndex: 10 }}>
        <InfiniteTicker direction={1} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* S.L.A.B — all four letters in one row */}
        <View style={styles.letterRow}>
          {renderLetterButton(0)}
          {expandedIndex !== 0 && expandedIndex !== 1 && (
            <Text style={styles.dotText}>.</Text>
          )}
          {renderLetterButton(1)}
          {expandedIndex !== 1 && expandedIndex !== 2 && (
            <Text style={styles.dotText}>.</Text>
          )}
          {renderLetterButton(2)}
          {expandedIndex !== 2 && expandedIndex !== 3 && (
            <Text style={styles.dotText}>.</Text>
          )}
          {renderLetterButton(3)}
        </View>

        {/* Expanded content — below the full SLAB row */}
        {expandedIndex !== null && renderExpandedContent(LETTERS[expandedIndex], expandedIndex)}

        {/* Spinning logo video — full phone width, no glow */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={logoVideo}
            style={styles.logoVideo}
            resizeMode={ResizeMode.COVER}
            isLooping
            isMuted
            shouldPlay
          />
          <View style={styles.videoDarkOverlay} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerLine}>SalesLab Immersion{'\u2122'}</Text>
          <Text style={styles.footerLine}>Voice Intelligence Platform</Text>
          <Text style={styles.footerYear}>2025</Text>
          <Text style={styles.footerCopyright}>{'\u00A9'}</Text>
        </View>
      </ScrollView>

      {/* Bottom ticker — scrolls opposite direction */}
      <View style={{ marginBottom: Platform.OS === 'ios' ? 20 : 10, zIndex: 10 }}>
        <InfiniteTicker direction={-1} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
    zIndex: 5,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
    paddingTop: 10,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.55,
    marginVertical: 8,
  },
  logoVideo: {
    width: '100%',
    height: '100%',
  },
  videoDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  letterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  letterTouchable: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Rounded View wrapper — borderRadius makes iOS draw a soft oval shadow (no square halo)
  letterGlowView: {
    borderRadius: 999,
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 14,
  },
  letterGlowViewExpanded: {
    shadowColor: '#ffff00',
    shadowRadius: 18,
  },
  letterGlowViewDimmed: {
    opacity: 0.3,
  },
  letterText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#f39c12',
    letterSpacing: 2,
  },
  letterTextExpanded: {
    fontSize: 42,
    color: '#ffff00',
  },
  letterTextDimmed: {
    opacity: 0.3,
  },
  dotText: {
    fontSize: 26,
    color: '#f39c12',
    ...goldGlow,
  },
  expandedContent: {
    width: SCREEN_WIDTH - 60,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  expandedDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  actionButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  comingSoonText: {
    color: '#f39c12',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerLine: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 22,
  },
  footerYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  footerCopyright: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 2,
  },
})
