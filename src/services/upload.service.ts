import * as FileSystem from 'expo-file-system'
import { supabase } from '../utils/supabase'
import { decode } from 'base64-arraybuffer'

/**
 * Upload Service
 * Handles audio file uploads to Supabase Storage and triggers transcription
 */

interface UploadMetadata {
  salesperson_name: string
  original_filename?: string
}

interface UploadProgress {
  progress: number
  total: number
  uploaded: number
}

/**
 * Upload an audio file to Supabase Storage
 * @param uri - Local file URI
 * @param metadata - Upload metadata (salesperson name, etc.)
 * @param companyId - Company ID for organization
 * @param userId - User ID who is uploading
 * @param onProgress - Optional progress callback
 * @returns Upload result with file path and transcript ID
 */
export async function uploadAudio(
  uri: string,
  metadata: UploadMetadata,
  companyId: string,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; transcriptId?: string; error?: string }> {
  try {
    // Step 1: Read file info
    const fileInfo = await FileSystem.getInfoAsync(uri)
    if (!fileInfo.exists) {
      throw new Error('File does not exist')
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = uri.split('.').pop() || 'm4a'
    const filename = `${timestamp}-${metadata.salesperson_name.replace(/\s+/g, '-')}.${extension}`
    const storagePath = `${companyId}/${filename}`

    // Step 2: Read file as base64
    const fileContent = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    })

    // Report progress (file read complete)
    onProgress?.({
      progress: 30,
      total: 100,
      uploaded: 30,
    })

    // Step 3: Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(storagePath, decode(fileContent), {
        contentType: `audio/${extension}`,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Report progress (upload complete)
    onProgress?.({
      progress: 70,
      total: 100,
      uploaded: 70,
    })

    // Step 4: Create transcript record in database
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        company_id: companyId,
        uploaded_by: userId,
        salesperson_name: metadata.salesperson_name,
        original_filename: metadata.original_filename || filename,
        audio_file_path: uploadData.path,
        redaction_config_used: 'default', // TODO: Allow user to select config
        transcript_data: {
          status: 'pending',
          text: null,
        },
      })
      .select()
      .single()

    if (transcriptError) {
      console.error('Transcript creation error:', transcriptError)
      throw new Error(`Failed to create transcript: ${transcriptError.message}`)
    }

    // Report progress (database record created)
    onProgress?.({
      progress: 90,
      total: 100,
      uploaded: 90,
    })

    // Step 5: Call backend API to process the audio (if available)
    // NOTE: This would call your Next.js API endpoint
    // For now, we're just creating the record - the backend can pick it up via webhook or polling

    // Get the API URL from environment if available
    const apiUrl = process.env.EXPO_PUBLIC_API_URL
    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}/api/process-audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcript_id: transcriptData.id,
            file_path: uploadData.path,
            company_id: companyId,
            salesperson_name: metadata.salesperson_name,
          }),
        })

        if (!response.ok) {
          console.warn('API processing failed, transcript will be processed asynchronously')
        }
      } catch (apiError) {
        console.warn('Failed to trigger API processing:', apiError)
        // Not critical - the record is created and can be processed later
      }
    }

    // Report complete
    onProgress?.({
      progress: 100,
      total: 100,
      uploaded: 100,
    })

    return {
      success: true,
      transcriptId: transcriptData.id,
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Delete an audio file from storage
 * @param filePath - Storage path to delete
 */
export async function deleteAudioFile(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('audio-files')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}
