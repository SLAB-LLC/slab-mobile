# SLAB Mobile - Troubleshooting Guide

## Transcripts Show No Text Content

If you're seeing transcript metadata (upload time, salesperson name) but no actual transcript text or audio, follow these steps:

### Step 1: Check Debug Info (Development Mode)

1. Open the app in development mode (`npm start`)
2. Navigate to a transcript detail screen
3. Scroll to the bottom - you'll see a "Debug Info" section
4. Check these values:

```
Has transcript_redacted: [Yes/No]  ← Backend-processed transcripts
Has transcript_data: [Yes/No]      ← Mobile-created transcripts
Has text content: [Yes/No]         ← Actual transcript text available
Audio path: [path or None]         ← Audio file location
Status: [Pending/Complete]         ← Processing status
Data keys: [list of fields]        ← Available data fields
```

### Step 2: Understand the Data Structure

**Web app transcripts** (uploaded via the web interface):
- Have `transcript_redacted` field populated by backend
- Should show: `Has transcript_redacted: Yes`, `Has text content: Yes`
- Audio path should be the redacted version

**Mobile app transcripts** (uploaded via mobile):
- Created with `transcript_data: { status: 'pending', text: null }`
- Backend must process them to populate `transcript_redacted`
- Until processed: `Has transcript_redacted: No`, `Status: Pending`

### Step 3: Verify Database Content

Connect to your Supabase database and run:

```sql
-- Check a specific transcript
SELECT
  id,
  salesperson_name,
  original_filename,
  file_storage_path,
  transcript_redacted IS NOT NULL as has_backend_data,
  transcript_data IS NOT NULL as has_mobile_data,
  (transcript_redacted->>'text') IS NOT NULL as has_text,
  created_at
FROM transcripts
WHERE id = 'YOUR_TRANSCRIPT_ID'
LIMIT 1;

-- Check all transcripts
SELECT
  COUNT(*) as total,
  COUNT(transcript_redacted) as with_backend_data,
  COUNT(transcript_data) as with_mobile_data
FROM transcripts;
```

### Step 4: Common Scenarios

#### Scenario A: Web Transcripts Not Showing
**Symptoms:**
- Transcript uploaded via web app
- Debug shows: `Has transcript_redacted: Yes`
- Still no text visible

**Solution:**
Check the field structure. The backend might be using a different structure than expected.

Run this query:
```sql
SELECT
  id,
  transcript_redacted->'text' as text_field,
  jsonb_typeof(transcript_redacted->'text') as text_type
FROM transcripts
WHERE id = 'YOUR_TRANSCRIPT_ID';
```

If `text_type` is not `string`, the data structure is different than expected.

#### Scenario B: Mobile Transcripts Stuck on "Processing"
**Symptoms:**
- Transcript uploaded via mobile app
- Debug shows: `Has transcript_data: Yes`, `Status: Pending`
- Never completes

**Solution:**
The backend API is not processing the upload. Check:

1. **Backend is running:** Make sure your Next.js app is running
2. **API URL is correct:** Check `.env` file for `EXPO_PUBLIC_API_URL`
3. **Backend logs:** Check backend console for errors when upload happens
4. **Backend API endpoint:** Verify `/api/process-audio` exists and is working

To manually trigger processing, you can call the backend API:
```bash
curl -X POST http://localhost:3000/api/process-audio \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "company-id/filename.m4a",
    "originalFilename": "recording.m4a",
    "salespersonId": "salesperson-uuid",
    "metadata": {}
  }'
```

#### Scenario C: No Audio Playback
**Symptoms:**
- Transcript text is visible
- No audio player appears

**Solution:**
1. Check Debug Info for "Audio path"
2. If "None", the transcript has no associated audio file
3. If there's a path, check Supabase Storage:
   - Go to Supabase dashboard → Storage → `call-recordings` bucket
   - Verify the file exists at the path shown

### Step 5: Backend Integration Issues

**Expected Flow:**
1. Mobile app uploads audio → Creates transcript record with `transcript_data: { status: 'pending' }`
2. Mobile app calls `/api/process-audio` → Backend processes audio
3. Backend:
   - Downloads audio from Supabase Storage
   - Sends to AssemblyAI for transcription
   - Detects PII and redacts audio
   - Saves to `transcript_redacted` field
4. Mobile app refreshes → Shows transcript text

**If backend processing fails:**
- Check backend API parameters match what mobile sends
- Check AssemblyAI API key is configured
- Check ffmpeg is installed (for audio redaction)
- Check backend has permission to access Supabase Storage

### Step 6: Migration Path

If you have existing transcripts that were created differently:

**Option 1: Update existing records**
```sql
-- Copy transcript_data to transcript_redacted for mobile-uploaded transcripts
UPDATE transcripts
SET transcript_redacted = transcript_data
WHERE transcript_data IS NOT NULL
  AND transcript_redacted IS NULL;
```

**Option 2: Re-process mobile uploads**
Trigger backend processing for all pending transcripts.

### Step 7: Testing with Fresh Data

To test end-to-end:

1. **Start backend:** `cd ../SLAB && npm run dev`
2. **Start mobile app:** `npm start`
3. **Record new audio:** Use FAB button, record 10 seconds
4. **Upload:** Enter salesperson name, tap upload
5. **Monitor backend console:** Watch for processing logs
6. **Refresh transcript:** Pull to refresh on detail screen
7. **Check debug info:** Verify data is populated

### Quick Fixes

**No text visible but data exists:**
```typescript
// Check if issue is with component rendering
// In TranscriptDetailScreen.tsx, temporarily add:
console.log('Transcript data:', transcript.transcript_redacted || transcript.transcript_data)
```

**Audio player not showing:**
```typescript
// Check audio path
console.log('Audio path:', transcript.transcript_redacted?.redacted_file_storage_path || transcript.file_storage_path)
```

**Backend API not being called:**
```typescript
// In upload.service.ts, check this section (lines 118-141)
// Add more detailed logging:
console.log('Calling backend API:', apiUrl)
console.log('With data:', { transcript_id, file_path, company_id, salesperson_name })
```

### Getting Help

If issues persist:

1. Check the Debug Info section in the app
2. Check Supabase database directly
3. Check backend console logs
4. Check network requests in React DevTools
5. File an issue with:
   - Debug Info output
   - Database query results
   - Backend logs (if applicable)
   - Steps to reproduce

---

## Other Common Issues

### "Cannot connect to backend"
- Verify backend is running: `cd ../SLAB && npm run dev`
- Check `EXPO_PUBLIC_API_URL` in `.env`
- If on physical device, use your computer's IP: `http://192.168.1.X:3000`

### Authentication Issues
- Clear app data and re-login
- Verify Supabase credentials in `.env`
- Check Supabase dashboard for user account

### Performance Issues
- Close background apps
- Restart metro bundler: `r` in terminal
- Clear cache: `npm start -- --clear`

### Build Issues
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear watchman: `watchman watch-del-all`
- Reset metro: `npm start -- --reset-cache`
