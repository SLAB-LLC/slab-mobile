# SLAB Mobile Setup Guide

## What We Just Built

A React Native mobile app that connects to your existing SLAB Voice backend. Here's what's included:

✅ **Complete authentication flow** - Login screen with Supabase auth
✅ **Transcript viewing** - Dashboard with list and detail views
✅ **Training videos** - Browse company training videos
✅ **User profile** - View profile info and sign out
✅ **Navigation** - Bottom tabs + stack navigation
✅ **TypeScript types** - Shared types from your web app

## Quick Start (5 Minutes)

1. **Open terminal in the SLAB-mobile directory:**
   ```bash
   cd C:\Users\dunca\OneDrive\Documents\Code_Projects\SLAB-mobile
   ```

2. **Start the app:**
   ```bash
   npm start
   ```

3. **Choose your platform:**
   - Press `i` for iOS Simulator (need Xcode on Mac)
   - Press `a` for Android Emulator (need Android Studio)
   - Scan QR code with **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

4. **Login with your existing credentials** from the web app

## File Structure

```
SLAB-mobile/
├── App.tsx                          # Entry point
├── .env                             # Environment config (Supabase credentials)
├── app.json                         # Expo config
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx         # Navigation setup (login vs logged in)
│   ├── screens/
│   │   ├── LoginScreen.tsx          # Email/password login
│   │   ├── DashboardScreen.tsx      # Transcript list
│   │   ├── TranscriptDetailScreen.tsx  # Individual transcript
│   │   ├── TrainingVideosScreen.tsx    # Training videos
│   │   └── ProfileScreen.tsx        # User profile & sign out
│   ├── types/
│   │   └── index.ts                 # TypeScript types
│   └── utils/
│       ├── supabase.ts              # Supabase client
│       └── auth.ts                  # Auth helpers
```

## How It Connects to Your Backend

### Direct Supabase Access (what we're using now):
- ✅ Login/logout
- ✅ Read transcripts
- ✅ Read training videos
- ✅ User profiles

### Via Next.js API (not implemented yet):
- 🔜 Upload audio
- 🔜 Process transcriptions (AssemblyAI)
- 🔜 Complex admin operations

## What to Build Next

### Priority 1: Audio Recording
**Goal:** Record audio in the app and send to your backend for transcription

**Steps:**
1. Add recording screen with expo-av
2. Upload recorded audio to Supabase Storage
3. Call `/api/process-audio` on your Next.js backend
4. Poll for completion or use webhooks

**Files to create:**
- `src/screens/RecordScreen.tsx`
- `src/services/audioUpload.ts`

### Priority 2: Audio Upload
**Goal:** Let users upload existing audio files

**Steps:**
1. Use expo-document-picker to select files
2. Upload to Supabase Storage
3. Call transcription API

**Files to create:**
- `src/screens/UploadScreen.tsx`
- Update `AppNavigator.tsx` to add upload tab

### Priority 3: Video Player
**Goal:** Play uploaded training videos in-app (not just YouTube)

**Steps:**
1. Install expo-video
2. Add video player to TrainingVideosScreen
3. Download from Supabase Storage and play

**Dependencies:**
```bash
npx expo install expo-video
```

## Testing on Different Devices

### iOS (Mac required for simulator)
- **Simulator:** Press `i` after `npm start`
- **Real device:** Install Expo Go from App Store, scan QR code

### Android
- **Emulator:** Press `a` after `npm start`
- **Real device:** Install Expo Go from Play Store, scan QR code

### Web (for quick testing)
- Press `w` after `npm start`
- Note: Some native features won't work on web

## Building for App Store

When you're ready to publish:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure project:**
   ```bash
   eas build:configure
   ```

4. **Build for iOS:**
   ```bash
   eas build --platform ios
   ```

5. **Submit to App Store:**
   ```bash
   eas submit --platform ios
   ```

### Requirements:
- Apple Developer account ($99/year)
- Bundle ID configured in app.json (already done: `com.slabvoice.mobile`)
- App icons and splash screens
- Privacy policy (important since you handle PII!)

## Environment Variables

Current setup in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://ciyjknevyutjsughoynu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**Important:**
- On physical devices, change `localhost` to your computer's IP address
- For production, use your deployed Next.js URL (e.g., https://slab-voice.vercel.app)

## Common Commands

```bash
npm start          # Start Expo dev server
npm run android    # Start on Android
npm run ios        # Start on iOS (Mac only)
npm run web        # Start web version

eas build          # Build for production
eas submit         # Submit to app stores
```

## Troubleshooting

**App won't connect to backend:**
- Check that Next.js is running (`npm run dev` in SLAB directory)
- On physical device, update `EXPO_PUBLIC_API_URL` to your computer's IP
- Check firewall settings

**Login fails:**
- Verify Supabase credentials in `.env`
- Check Supabase dashboard for auth issues
- Clear app data and try again

**Build fails:**
- Run `npx expo-doctor` to check for issues
- Make sure all dependencies are installed
- Check Node.js version (18+ required)

## Next Steps

1. **Test the current app** - Run it and make sure login works
2. **Add audio recording** - Build the recording screen
3. **Design improvements** - Match your web app's branding
4. **Add missing features** - Leaderboards, chat, etc.
5. **App Store submission** - Build and submit when ready

## Questions?

- Expo docs: https://docs.expo.dev
- React Navigation: https://reactnavigation.org
- Supabase React Native: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native

---

**Remember:** This is a DIY project. Take it step by step, test frequently, and don't be afraid to break things and learn!
