# SLAB Mobile App - Testing Guide

## Overview
This guide provides comprehensive testing procedures for the SLAB Voice mobile app to ensure production readiness.

---

## 1. Multi-Tenant Security Testing (CRITICAL ⚠️)

### Prerequisites
- 2 test companies in Supabase
- 2 test users (one per company)
- Sample transcripts for both companies
- Sample training videos for both companies

### Test Procedures

#### Test 1.1: Company Isolation - Transcripts
**Goal:** Verify users only see transcripts they have access to via subscriptions

1. Login as User A (Company 1)
2. Note the transcripts displayed on Dashboard
3. Verify all transcripts are either:
   - From salespeople User A subscribes to
   - Assigned to User A
   - Uploaded by User A
4. Open a transcript and note its ID
5. Logout

6. Login as User B (Company 2)
7. Verify Dashboard shows different transcripts
8. Try to navigate to Company 1's transcript ID (manual URL if possible)
9. Verify access is denied or transcript not found

✅ **PASS:** Each user only sees their accessible transcripts
❌ **FAIL:** User can see transcripts from other companies

#### Test 1.2: Company Isolation - Training Videos
1. Login as User A (Company 1)
2. Navigate to Training tab
3. Note the videos displayed
4. Verify all videos have Company 1's company_id
5. Logout

6. Login as User B (Company 2)
7. Navigate to Training tab
8. Verify only Company 2's videos are shown

✅ **PASS:** Each company only sees their training videos
❌ **FAIL:** Videos from other companies visible

#### Test 1.3: Subscription-Based Access
1. On web app, subscribe User A to salesperson "John Smith"
2. On web app, create transcripts for "John Smith"
3. Login to mobile app as User A
4. Pull to refresh on Dashboard
5. Verify John Smith's transcripts appear

6. On web app, unsubscribe User A from "John Smith"
7. Pull to refresh on mobile app
8. Verify John Smith's transcripts disappear

✅ **PASS:** Subscriptions control transcript visibility
❌ **FAIL:** Subscriptions don't affect visibility

---

## 2. Authentication Flow Testing

#### Test 2.1: Initial Login
1. Open app (fresh install or cleared data)
2. Verify Login screen is shown
3. Enter valid credentials
4. Tap "Sign In"
5. Verify navigation to Dashboard
6. Verify user profile loads (check Profile tab)

✅ **PASS:** Smooth login flow, data loads correctly
❌ **FAIL:** Errors, crashes, or missing data

#### Test 2.2: Invalid Credentials
1. Open Login screen
2. Enter invalid email/password
3. Tap "Sign In"
4. Verify error alert is shown
5. Verify user-friendly error message (not raw error)

✅ **PASS:** Clear error message shown
❌ **FAIL:** App crashes or shows technical error

#### Test 2.3: Session Persistence
1. Login successfully
2. Close app completely (force quit)
3. Reopen app
4. Verify user is still logged in
5. Verify Dashboard loads without re-login

✅ **PASS:** Session persists across app restarts
❌ **FAIL:** User must re-login

#### Test 2.4: Sign Out
1. Navigate to Profile tab
2. Tap "Sign Out"
3. Confirm in dialog
4. Verify navigation to Login screen
5. Verify data is cleared (cached transcripts gone)

✅ **PASS:** Clean sign out, data cleared
❌ **FAIL:** Still shows user data or crashes

---

## 3. Audio Recording Testing

### iOS Testing

#### Test 3.1: First Time Recording (iOS)
1. Tap FAB on Dashboard
2. Verify microphone permission prompt appears
3. Tap "Allow"
4. Enter salesperson name: "Test User"
5. Tap Record button
6. Verify recording indicator appears (red button, timer)
7. Speak for 10 seconds
8. Tap Stop
9. Verify preview screen appears
10. Tap Play
11. Verify audio plays back correctly
12. Tap Upload
13. Verify upload progress shown
14. Verify success message
15. Navigate back to Dashboard
16. Pull to refresh
17. Verify new transcript appears

✅ **PASS:** Full recording flow works on iOS
❌ **FAIL:** Any step fails or crashes

#### Test 3.2: Permission Denied (iOS)
1. Tap FAB on Dashboard
2. If prompted for permission, tap "Don't Allow"
3. Verify error message shown
4. Verify Record button is disabled
5. Verify helpful message about permissions

✅ **PASS:** Graceful handling of denied permissions
❌ **FAIL:** App crashes or unclear error

#### Test 3.3: Long Recording (iOS)
1. Start recording
2. Let it run for 5+ minutes
3. Verify timer updates correctly
4. Stop recording
5. Verify playback works
6. Verify upload succeeds with large file

✅ **PASS:** Long recordings work correctly
❌ **FAIL:** Timer stops, playback fails, or upload fails

#### Test 3.4: Maximum Duration (iOS)
1. Start recording
2. Let it run until 10 minutes
3. Verify recording auto-stops at 10 minutes
4. Verify alert is shown about max duration
5. Verify preview screen appears
6. Verify upload works

✅ **PASS:** Max duration enforced correctly
❌ **FAIL:** Recording continues past 10 min or crashes

### Android Testing

Repeat Tests 3.1-3.4 on Android device/emulator

✅ **PASS:** All tests pass on Android
❌ **FAIL:** Any platform-specific issues

#### Test 3.5: Re-record
1. Record audio
2. On preview screen, tap "Re-record"
3. Verify return to recording screen
4. Verify previous recording is discarded
5. Record new audio
6. Verify new recording is used

✅ **PASS:** Re-record works correctly
❌ **FAIL:** Old recording persists or crashes

#### Test 3.6: Cancel Recording
1. Record audio
2. On preview screen, tap "Cancel"
3. Verify confirmation dialog
4. Confirm cancellation
5. Verify navigation back to Dashboard
6. Verify temp files cleaned up (no orphaned recordings)

✅ **PASS:** Cancellation cleans up properly
❌ **FAIL:** Temp files remain or crashes

---

## 4. Search & Filter Testing

#### Test 4.1: Search Functionality
1. Navigate to Dashboard with multiple transcripts
2. Tap search bar
3. Type a salesperson name (partial match)
4. Verify transcripts filter in real-time
5. Verify result count updates
6. Verify empty state if no matches
7. Clear search
8. Verify all transcripts return

✅ **PASS:** Search works smoothly
❌ **FAIL:** Search doesn't filter or crashes

#### Test 4.2: Salesperson Filter
1. Tap "Filter by Salesperson" chip
2. Verify dropdown menu appears
3. Select a salesperson
4. Verify only their transcripts show
5. Verify result count updates
6. Verify "Clear Filters" chip appears
7. Tap "Clear Filters"
8. Verify all transcripts return

✅ **PASS:** Filter works correctly
❌ **FAIL:** Filter doesn't apply or crashes

#### Test 4.3: Combined Search & Filter
1. Type in search bar
2. Select salesperson filter
3. Verify both filters apply together
4. Verify correct results shown
5. Clear filters
6. Verify all transcripts return

✅ **PASS:** Combined filtering works
❌ **FAIL:** Filters conflict or crash

---

## 5. Infinite Scroll Testing

#### Test 5.1: Load More Transcripts
1. Ensure account has 30+ transcripts
2. Navigate to Dashboard
3. Verify 20 transcripts initially shown
4. Scroll to bottom
5. Verify loading indicator appears
6. Verify next 20 transcripts load
7. Continue scrolling
8. Verify smooth loading until all transcripts shown

✅ **PASS:** Infinite scroll works smoothly
❌ **FAIL:** Doesn't load more or crashes

#### Test 5.2: Scroll Performance
1. With 50+ transcripts
2. Rapidly scroll up and down
3. Verify smooth 60fps scrolling
4. Verify no lag or jank
5. Verify images/cards render quickly

✅ **PASS:** Smooth scrolling performance
❌ **FAIL:** Lag, jank, or slow rendering

---

## 6. Transcript Detail Testing

#### Test 6.1: View Transcript
1. Tap a transcript from Dashboard
2. Verify detail screen loads
3. Verify all metadata shown:
   - Salesperson name
   - Date/time
   - Filename
   - Status badge
   - Redaction count (if applicable)
4. Verify transcript text displays correctly
5. Verify formatting (speaker labels, paragraphs)

✅ **PASS:** All data displays correctly
❌ **FAIL:** Missing data or formatting issues

#### Test 6.2: Share Transcript
1. Open transcript detail
2. Tap share button (📤)
3. Verify native share sheet appears
4. Select "Messages" (or any app)
5. Verify transcript text is pre-filled
6. Verify metadata included
7. Verify proper formatting

✅ **PASS:** Share works correctly
❌ **FAIL:** Share fails or wrong content

#### Test 6.3: Copy Transcript
1. Open transcript detail
2. Scroll to transcript text section
3. Tap "Copy" button
4. Paste in Notes app
5. Verify full transcript text copied
6. Verify formatting preserved

✅ **PASS:** Copy works correctly
❌ **FAIL:** Copy fails or wrong content

#### Test 6.4: Playback Transcript Audio
1. Open transcript with audio playback (if implemented)
2. Tap play button
3. Verify audio plays
4. Verify progress bar updates
5. Verify pause works
6. Verify seek works

✅ **PASS:** Audio playback works (if implemented)
❌ **FAIL:** Playback issues
⚠️ **N/A:** Feature not yet implemented

---

## 7. Profile & Settings Testing

#### Test 7.1: View Profile
1. Navigate to Profile tab
2. Verify all info displays:
   - Name
   - Email
   - Role
   - Company name
3. Verify data matches user account

✅ **PASS:** Profile displays correctly
❌ **FAIL:** Missing or incorrect data

#### Test 7.2: Sign Out
1. Tap "Sign Out" button
2. Verify confirmation dialog
3. Cancel first attempt
4. Verify stays logged in
5. Sign out again and confirm
6. Verify navigation to Login
7. Verify clean state

✅ **PASS:** Sign out works correctly
❌ **FAIL:** Issues with sign out flow

---

## 8. Network & Error Handling Testing

#### Test 8.1: No Network - Initial Load
1. Disable WiFi and cellular
2. Open app
3. Verify error message shown
4. Verify user-friendly message (not technical)
5. Re-enable network
6. Pull to refresh
7. Verify data loads

✅ **PASS:** Graceful offline handling
❌ **FAIL:** Crash or confusing error

#### Test 8.2: Network Loss During Upload
1. Start recording audio
2. Complete recording
3. Disable network
4. Tap Upload
5. Verify error shown
6. Verify option to retry
7. Re-enable network
8. Retry upload
9. Verify success

✅ **PASS:** Upload failure handled gracefully
❌ **FAIL:** Crash or data loss

#### Test 8.3: Slow Network
1. Enable network throttling (simulate 3G)
2. Navigate Dashboard
3. Verify loading indicators show
4. Verify transcripts eventually load
5. Open transcript detail
6. Verify patient loading
7. Start upload
8. Verify progress updates appropriately

✅ **PASS:** Handles slow network gracefully
❌ **FAIL:** Timeouts or crashes

---

## 9. Edge Cases & Stress Testing

#### Test 9.1: Empty States
1. Login as new user with no subscriptions
2. Verify Dashboard empty state
3. Verify helpful message
4. Navigate to Training tab
5. Verify Training empty state

✅ **PASS:** Empty states helpful and clear
❌ **FAIL:** Confusing or broken UI

#### Test 9.2: Large Dataset
1. Account with 100+ transcripts
2. Navigate Dashboard
3. Verify pagination works
4. Search for specific transcript
5. Verify search performance
6. Apply filters
7. Verify filter performance

✅ **PASS:** Handles large datasets well
❌ **FAIL:** Slow or crashes

#### Test 9.3: Special Characters
1. Record audio with salesperson name containing special characters
   - Example: "O'Brien & Associates"
2. Verify upload succeeds
3. Verify display is correct
4. Search for the name
5. Verify search finds it

✅ **PASS:** Special characters handled
❌ **FAIL:** Encoding issues or search fails

#### Test 9.4: App Backgrounding
1. Start recording
2. Background the app (home button)
3. Wait 30 seconds
4. Return to app
5. Verify recording still active (or stopped gracefully)
6. Complete flow
7. Verify data intact

✅ **PASS:** Handles backgrounding gracefully
❌ **FAIL:** Recording lost or crash

---

## 10. UI/UX Polish Testing

#### Test 10.1: Brand Consistency
1. Navigate through all screens
2. Verify gold brand color (#D4AF37) used consistently
3. Verify spacing is consistent
4. Verify typography is consistent
5. Verify all buttons use branded styles

✅ **PASS:** Consistent branding throughout
❌ **FAIL:** Inconsistent styles

#### Test 10.2: Loading States
1. Navigate through app
2. Verify all async operations show loading indicators:
   - Login
   - Transcript fetch
   - Training videos fetch
   - Upload
   - Search/filter
3. Verify indicators use brand color
4. Verify appropriate size and placement

✅ **PASS:** All loading states present
❌ **FAIL:** Missing loading indicators

#### Test 10.3: Error States
1. Trigger various errors:
   - Invalid login
   - Network failure
   - Upload failure
   - Permission denied
2. Verify all errors show user-friendly messages
3. Verify error colors/styling consistent
4. Verify actionable (retry, fix, etc.)

✅ **PASS:** User-friendly error handling
❌ **FAIL:** Technical errors or crashes

---

## 11. Platform-Specific Testing

### iOS Specific

- [ ] Test on iPhone (physical device)
- [ ] Test on iPad (if supported)
- [ ] Test on iOS 15+
- [ ] Verify safe area handling (notch)
- [ ] Verify keyboard handling
- [ ] Verify haptic feedback (if implemented)
- [ ] Verify background audio (if applicable)

### Android Specific

- [ ] Test on Android phone (physical device)
- [ ] Test on Android tablet (if supported)
- [ ] Test on Android 11+
- [ ] Verify back button behavior
- [ ] Verify keyboard handling
- [ ] Verify permissions flow
- [ ] Verify background behavior

---

## 12. Performance Metrics

### Target Metrics

- **App Launch:** < 2 seconds
- **Screen Transitions:** < 300ms
- **Search Response:** < 200ms
- **Scroll FPS:** 60fps
- **Upload Progress:** Updates every 100ms

### Measurement

1. Use React DevTools Profiler
2. Use Expo Performance Monitor
3. Monitor memory usage
4. Check for memory leaks

✅ **PASS:** All metrics within targets
❌ **FAIL:** Performance issues identified

---

## Final Checklist

### Critical Issues (Must Fix)
- [ ] No security vulnerabilities (multi-tenant isolation)
- [ ] No data loss scenarios
- [ ] No crashes on happy path
- [ ] All core features work (login, record, upload, view)

### High Priority
- [ ] Error messages are user-friendly
- [ ] Loading states everywhere
- [ ] Empty states helpful
- [ ] Branding consistent

### Nice to Have
- [ ] Animations smooth
- [ ] Haptic feedback
- [ ] Dark mode support
- [ ] Offline mode

---

## Bug Reporting Template

When reporting bugs, include:

1. **Steps to Reproduce**
2. **Expected Behavior**
3. **Actual Behavior**
4. **Platform** (iOS/Android, version)
5. **Screenshots/Video**
6. **Console Logs** (if applicable)

---

## Sign-Off

Once all tests pass, the app is ready for:
- [ ] Beta testing
- [ ] TestFlight/Internal testing (iOS)
- [ ] Play Store Internal testing (Android)
- [ ] Production release

---

**Last Updated:** February 2026
**Version:** 1.0.0
**Tested By:** _____________
**Date:** _____________
