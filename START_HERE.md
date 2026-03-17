# 🚀 START HERE

## What You Have Now

A fully functional React Native mobile app for SLAB Voice! Here's what works right now:

- ✅ **Login** - Same credentials as your web app
- ✅ **Transcripts** - Browse and view all your transcripts
- ✅ **Training Videos** - View company training videos
- ✅ **Profile** - User info and sign out

## Get It Running (2 Minutes)

### Step 1: Open Terminal in SLAB-mobile

```bash
cd C:\Users\dunca\OneDrive\Documents\Code_Projects\SLAB-mobile
```

### Step 2: Start the App

```bash
npm start
```

### Step 3: Open on Your Device

**Option A: On Your Phone (Easiest)**
1. Install **Expo Go** app ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
2. Scan the QR code that appears in your terminal
3. App will load on your phone!

**Option B: iOS Simulator (Mac Only)**
- Press `i` in the terminal

**Option C: Android Emulator**
- Press `a` in the terminal

### Step 4: Login

Use the same email/password you use for the web app.

## Important Note About Backend

The mobile app needs your Next.js backend running to work fully.

**Before testing, make sure:**

1. Open another terminal
2. Navigate to your SLAB project:
   ```bash
   cd C:\Users\dunca\OneDrive\Documents\Code_Projects\SLAB
   npm run dev
   ```
3. Keep it running while testing the mobile app

## Testing on Your Phone?

If testing on a physical device (not simulator), you need to update the API URL:

1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4)
   - Mac: `ifconfig` (look for inet)

2. Update `.env` file in SLAB-mobile:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
   ```
   Example: `http://192.168.1.5:3000`

3. Restart the app (`npm start` again)

## What's NOT Built Yet

These are the next features to add:

- 🎤 **Audio Recording** - Record in-app (currently only view existing)
- 📤 **Audio Upload** - Upload from device
- 📹 **Video Player** - Play uploaded videos in-app
- 🏆 **Leaderboards** - Company leaderboards
- 💬 **Chat** - Team messaging
- 🔔 **Push Notifications** - Transcription complete alerts

## File Overview

Don't get overwhelmed! Here are the key files:

```
src/
├── screens/                    # All your app screens
│   ├── LoginScreen.tsx         # Login page
│   ├── DashboardScreen.tsx     # Transcript list
│   ├── TranscriptDetailScreen.tsx  # Transcript viewer
│   ├── TrainingVideosScreen.tsx    # Training videos
│   └── ProfileScreen.tsx       # User profile
│
├── navigation/
│   └── AppNavigator.tsx        # Routes between screens
│
├── utils/
│   ├── supabase.ts            # Database connection
│   └── auth.ts                # Login/logout functions
│
└── types/
    └── index.ts               # TypeScript types
```

**To edit a screen:** Just open the file, make changes, and it'll hot reload!

## Next Steps

1. ✅ **Test it** - Run the app and make sure everything works
2. 📱 **Customize** - Change colors, add your branding
3. 🎤 **Add recording** - See SETUP_GUIDE.md for how
4. 🚀 **Build for App Store** - When ready, follow README.md

## Quick Customization

Want to change the gold color theme?

Search for `#D4AF37` in all files and replace with your color!

```bash
# In SLAB-mobile directory
grep -r "#D4AF37" src/
```

## Having Issues?

**App won't load?**
- Make sure dependencies installed: `npm install`
- Clear cache: `npx expo start --clear`

**Can't login?**
- Check Supabase credentials in `.env`
- Make sure you're using correct email/password

**Backend connection fails?**
- Make sure Next.js is running (`npm run dev` in SLAB directory)
- On physical device, use IP address instead of localhost

## Files to Read

1. **START_HERE.md** ← You are here!
2. **SETUP_GUIDE.md** - Detailed technical guide
3. **README.md** - Full documentation

## Ready to Build Features?

Check out **SETUP_GUIDE.md** for:
- How to add audio recording
- How to upload files
- How to add more screens
- How to build for App Store

---

**You got this Duncan! Start with `npm start` and see your app come to life! 🎉**
