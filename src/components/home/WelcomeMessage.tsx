import React, { useState, useEffect, useRef } from 'react'
import { Text, StyleSheet, View } from 'react-native'

interface WelcomeMessageProps {
  name: string
}

export default function WelcomeMessage({ name }: WelcomeMessageProps) {
  const fullText = `Welcome back, ${name}`
  const [displayedText, setDisplayedText] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    indexRef.current = 0
    setDisplayedText('')

    const interval = setInterval(() => {
      indexRef.current++
      if (indexRef.current <= fullText.length) {
        setDisplayedText(fullText.slice(0, indexRef.current))
      } else {
        clearInterval(interval)
      }
    }, 40)

    return () => clearInterval(interval)
  }, [name])

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {displayedText}
        <Text style={styles.cursor}>|</Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  text: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  cursor: {
    color: '#f39c12',
    fontWeight: '300',
  },
})
