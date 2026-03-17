# SLAB Voice Mobile 🎙️

React Native mobile app for SLAB Voice - AI-powered sales call transcription with PII redaction and sales training.

## 🎯 Overview

SLAB Voice Mobile enables sales teams to:
- 🎙️ **Record sales calls** directly in the app with one tap
- 📄 **View transcripts** with automatic PII redaction
- 🎥 **Access training videos** from their company library
- 🔍 **Search and filter** transcripts by salesperson or content
- 📤 **Share transcripts** with team members
- 🔐 **Multi-tenant security** with subscription-based access

## Tech Stack

- **React Native** with **Expo**
- **TypeScript**
- **Supabase** (Auth, Database, Storage)
- **React Navigation** (Navigation)
- **AssemblyAI** (via Next.js backend API)

## Prerequisites

- Node.js 18+ installed
- iOS Simulator (Mac only) or Expo Go app on your phone
- Next.js backend running (from ../SLAB)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

The `.env` file is already set up with your Supabase credentials. Make sure your Next.js backend is running on `http://localhost:3000`.

If deploying or testing on a physical device, update `EXPO_PUBLIC_API_URL` in `.env` to your backend URL.

### 3. Start the App

```bash
npm start
```

This will open Expo Dev Tools. You can then:

- Press `i` for iOS Simulator (Mac only)
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on your phone

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── common/        # Common components (Button, Card, Input, etc.)
│   ├── audio/         # Audio recording components
│   └── transcripts/   # Transcript-specific components
├── context/           # React Context providers
│   └── AuthContext.tsx
├── navigation/        # React Navigation setup
│   └── AppNavigator.tsx
├── screens/          # App screens
│   ├── LoginScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── RecordAudioScreen.tsx
│   ├── TranscriptDetailScreen.tsx
│   ├── TrainingVideosScreen.tsx
│   └── ProfileScreen.tsx
├── services/         # API service layer
│   ├── transcripts.service.ts
│   ├── training.service.ts
│   ├── company.service.ts
│   └── upload.service.ts
├── theme/            # Design system
│   ├── index.ts      # Theme configuration
│   └── tokens.ts     # Design tokens
├── types/            # TypeScript types
│   └── index.ts
└── utils/            # Utilities
    ├── supabase.ts   # Supabase client
    └── auth.ts       # Auth helpers
```

## ✨ Features

### Authentication & Security
- ✅ **Supabase Auth** - Secure email/password login
- ✅ **Session persistence** - Stay logged in across app restarts
- ✅ **Multi-tenant isolation** - Company data separation
- ✅ **Subscription-based access** - Users see only subscribed salespeople's transcripts
- ✅ **Row Level Security** - Database-level access control

### Audio Recording & Playback
- ✅ **One-tap recording** - FAB button on Dashboard
- ✅ **Live timer** - Real-time duration display
- ✅ **Preview & playback** - Listen before uploading
- ✅ **Progress tracking** - Visual upload progress
- ✅ **Max duration** - Auto-stop at 10 minutes
- ✅ **Metadata input** - Salesperson name for organization
- ✅ **Advanced audio player** - Full-featured playback controls
- ✅ **Playback speed** - 0.75x, 1x, 1.25x, 1.5x, 2x speed options
- ✅ **Skip controls** - 10-second skip forward/backward buttons
- ✅ **Conversation navigation** - Jump between conversations with Previous/Next
- ✅ **Word-level sync** - Highlight currently playing word in transcript
- ✅ **Scrubber** - Tap progress bar to jump to any position

### Transcript Management
- ✅ **Dashboard view** - All accessible transcripts
- ✅ **Search functionality** - Find by salesperson or filename
- ✅ **Filter by salesperson** - Dropdown menu with all salespeople
- ✅ **Infinite scroll** - Loads 20 transcripts at a time
- ✅ **Advanced transcript viewer** - Feature-rich detail screen matching web app
- ✅ **Conversation segmentation** - Auto-detected conversation breaks
- ✅ **Interactive transcript** - Clickable words with speaker labels
- ✅ **PII highlighting** - Visual indicators for redacted content
- ✅ **Conversation categories** - Sales, Pitches, Interactions
- ✅ **Objection tracking** - View detected objections per conversation
- ✅ **Share transcripts** - Native share sheet integration
- ✅ **Status indicators** - Pending/Complete badges

### Training Videos
- ✅ **Company videos** - Access company-specific training content
- ✅ **YouTube integration** - Opens YouTube videos in browser
- ✅ **Video metadata** - Thumbnails, duration, descriptions

### UI/UX
- ✅ **Professional design** - React Native Paper + custom components
- ✅ **Brand consistency** - Gold (#D4AF37) brand color throughout
- ✅ **Loading states** - Indicators for all async operations
- ✅ **Empty states** - Helpful messages when no data
- ✅ **Error handling** - User-friendly error messages
- ✅ **Error boundary** - Graceful crash recovery

### Coming Soon
- 📹 In-app video player (expo-av Video component)
- 🏆 Leaderboards
- 💬 Chat/messaging
- 📊 Usage analytics dashboard
- 🔔 Push notifications for transcript completion
- 🌙 Dark mode
- 📴 Offline support with local caching
- 🎯 Objection filtering UI (data is already available)
- 📈 Conversation analytics and insights

## Development Notes

### Transcript Data Structure

**Important:** The backend and mobile app use different field names for transcript data:

**Backend (web app):** Stores processed transcripts in `transcript_redacted` field:
```typescript
{
  text: string              // Full transcript text
  words: Array<{...}>       // Word-level timestamps
  pii_matches: Array<{...}> // PII redaction timestamps
  redacted_file_storage_path: string // Path to redacted audio
}
```

**Mobile app:** Creates pending transcripts with `transcript_data` field, but **reads from both**:
```typescript
{
  status: 'pending' | 'complete'
  text: string | null
}
```

**The mobile app now checks BOTH fields:**
1. First checks `transcript_redacted` (backend-processed transcripts)
2. Falls back to `transcript_data` (mobile-created pending transcripts)

### Backend API Integration

The mobile app calls your Next.js backend for:
- Audio processing (`/api/process-audio`) - **Currently not fully integrated**
- Admin operations
- Complex queries

**Current Status:**
- Mobile uploads create a transcript record with `status: 'pending'`
- Backend API call is attempted but may fail (checked in upload service)
- Backend needs to process the audio and populate `transcript_redacted` field
- Users can pull-to-refresh to check if processing completed

Direct Supabase access for:
- Auth (login/logout)
- Reading transcripts (both `transcript_redacted` and `transcript_data`)
- Reading training videos

### Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `EXPO_PUBLIC_API_URL` - Next.js backend URL (default: http://localhost:3000)

**Note:** In Expo, environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the app.

## Building for Production

### iOS

1. Join Apple Developer Program ($99/year)
2. Configure bundle identifier in `app.json`
3. Build with EAS:

```bash
npm install -g eas-cli
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

## 🧪 Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing procedures.

### Quick Testing
- **Development:** Use Expo Go app or simulators
- **Beta:** Use TestFlight (iOS) or internal testing (Android)
- **Production:** Submit to App Store / Google Play

### Critical Tests
1. **Multi-tenant security** - Users only see their company's data
2. **Subscription access** - Users see only subscribed salespeople
3. **Audio recording** - Test on both iOS and Android
4. **Upload flow** - Verify progress and success
5. **Search & filter** - Test with large datasets

## Common Issues

**"Cannot connect to backend"**
- Make sure Next.js backend is running
- Check `EXPO_PUBLIC_API_URL` in `.env`
- On physical device, use your computer's IP address instead of localhost

**"Supabase auth not working"**
- Clear app data and try again
- Check Supabase credentials in `.env`

**"Transcripts show no text content"**
- The mobile app looks for transcript data in `transcript_redacted.text` field
- Existing transcripts uploaded via the web app will have data in this field
- New transcripts uploaded via mobile app need to be processed by the backend
- Check the Debug Info section (dev mode only) to see what data is available
- Pull to refresh on the transcript detail screen to check if processing completed
- Audio recordings uploaded from mobile are created with `transcript_data: { status: 'pending', text: null }` and need backend processing to populate `transcript_redacted`

## 🏗️ Architecture

### Global State Management
- **AuthContext** - Provides user, profile, and company globally
- Eliminates redundant API calls across screens
- Single source of truth for authentication

### Service Layer
- **Centralized API calls** - All Supabase queries in service files
- **Company filtering** - Explicit company_id filtering for security
- **Error handling** - Consistent error messages
- **Type safety** - Full TypeScript support

### Component Library
- **Common components** - Button, Card, Input, ScreenHeader, EmptyState
- **Domain components** - TranscriptCard, VideoCard, AudioPreview
- **Design tokens** - Consistent spacing, colors, typography
- **React Native Paper** - Material Design foundation

### Data Flow
1. User logs in → AuthContext fetches profile + company
2. Screens use `useAuth()` hook for user/company data
3. Services handle all database queries with company filtering
4. RLS policies provide defense-in-depth security

---

## 🚀 Next Steps

### Short Term
1. ✅ ~~Add audio recording functionality~~ (COMPLETE)
2. ✅ ~~Add file upload UI~~ (COMPLETE)
3. ✅ ~~Integrate with Supabase Storage~~ (COMPLETE)
4. 🔄 Add backend API integration for transcription processing

### Medium Term
1. In-app video player for training videos
2. Push notifications for transcript completion
3. Offline support with local storage
4. Advanced analytics dashboard

### Long Term
1. Dark mode support
2. Leaderboards and gamification
3. Chat/messaging between team members
4. Voice command features
