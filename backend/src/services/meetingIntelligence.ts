import OpenAI from 'openai';
import admin, { db } from './firebase';
import crypto from 'crypto';
import * as gcsStorage from './gcsStorage';

import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';

// ✅ FIX: Initialize OpenAI with explicit API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * Generate hash of audio file for deduplication
 */
function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Check if file has already been processed
 */
async function checkDuplicateFile(
  userId: string,
  fileHash: string,
  filename: string
): Promise<{ isDuplicate: boolean; existingMeetingId?: string }> {
  // Check by file hash (most accurate)
  const hashQuery = await db
    .collection('meeting_minutes')
    .where('userId', '==', userId)
    .where('fileHash', '==', fileHash)
    .limit(1)
    .get();

  if (!hashQuery.empty) {
    return {
      isDuplicate: true,
      existingMeetingId: hashQuery.docs[0].id,
    };
  }

  // Also check by filename as a secondary check
  const filenameQuery = await db
    .collection('meeting_minutes')
    .where('userId', '==', userId)
    .where('originalFilename', '==', filename)
    .limit(1)
    .get();

  if (!filenameQuery.empty) {
    return {
      isDuplicate: true,
      existingMeetingId: filenameQuery.docs[0].id,
    };
  }

  return { isDuplicate: false };
}

/**
 * Transcribe audio using OpenAI Whisper
 */
export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  let tempFilePath: string | null = null;
  
  try {
    console.log(`🎤 Transcribing audio: ${filename} (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Create temp file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `temp-${Date.now()}-${filename}`);
    
    // Write buffer to temp file
    fs.writeFileSync(tempFilePath, audioBuffer);
    console.log(`💾 Saved temp file: ${tempFilePath}`);
    
    // Create read stream and transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json', // Get more details
    });

    console.log('✅ Transcription complete');
    console.log(`   Duration: ${transcription.duration || 'unknown'} seconds`);
    
    return transcription.text;

  } catch (error: any) {
    console.error('❌ Transcription error:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🗑️  Deleted temp file`);
      } catch (cleanupError) {
        console.warn('⚠️  Could not delete temp file:', cleanupError);
      }
    }
  }
}

/**
 * Generate meeting summary using GPT-4
 */
export async function generateMeetingSummary(transcript: string): Promise<any> {
  try {
    console.log('🤖 Generating meeting summary with GPT-4...');

    const prompt = `Analyze this ${Math.ceil(transcript.length / 1000)} minute meeting transcript in detail.

IMPORTANT: This is a ${Math.ceil(transcript.length / 1000)} minute conversation. Provide comprehensive, detailed analysis with specific examples and quotes where relevant.

Extract the following:

1. EXECUTIVE SUMMARY (3-5 sentences)
   - What was this meeting about?
   - What were the main outcomes?

2. DETAILED KEY POINTS (10-20 points for long meetings)
   - Specific topics discussed
   - Important details mentioned
   - Problems identified
   - Solutions proposed
   - Data, metrics, or numbers mentioned

3. DECISIONS MADE
   - Concrete decisions with context
   - Who made the decision (if mentioned)
   - Rationale if discussed

4. ACTION ITEMS (Be specific!)
   - Exact task description
   - Assignee name (if mentioned)
   - Due date or timeframe (if mentioned)
   - Context for why this task matters

5. NEXT STEPS & FOLLOW-UPS
   - What happens after this meeting?
   - Future meetings or checkpoints mentioned

6. ATTENDEES & ROLES
   - Extract names mentioned
   - Their roles or departments if discussed

7. IMPORTANT QUOTES OR STATEMENTS
   - Key things people said that provide context

Transcript:
${transcript}

Respond with detailed JSON:
{
  "title": "Descriptive meeting title based on content",
  "summary": "3-5 sentence executive summary",
  "keyPoints": ["Detailed point 1 with specifics...", "Detailed point 2...", ...],
  "decisions": ["Specific decision with context...", ...],
  "actionItems": [
    {
      "task": "Specific, actionable task description",
      "assignee": "Person's name or 'Unassigned'",
      "dueDate": "Date mentioned or 'Not specified'",
      "context": "Why this task is needed"
    }
  ],
  "nextSteps": ["Specific next step...", ...],
  "attendeeNames": ["Name 1", "Name 2", ...],
  "importantQuotes": ["Quote with speaker if known", ...],
  "topics": ["Topic 1", "Topic 2", ...],
  "duration": "Estimated: X minutes"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Or use 'gpt-4o' for even better results
      messages: [
        {
          role: 'system',
          content: 'You are an expert executive assistant who creates detailed, comprehensive meeting summaries. Extract maximum useful information from transcripts. Be specific and thorough. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,  // Increase token limit for longer summaries
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    console.log('✅ Meeting summary generated');

    return result;

  } catch (error: any) {
    console.error('❌ Summary generation error:', error);
    throw new Error(`Summary generation failed: ${error.message}`);
  }
}

/**
 * Extract meeting metadata
 */
export async function extractMeetingMetadata(transcript: string): Promise<any> {
  try {
    console.log('🔍 Extracting meeting metadata...');

    const prompt = `Extract the following information from this meeting transcript:
- Meeting title/topic
- Attendee names (if mentioned)
- Date/time mentioned (if any)
- Meeting duration estimate

Transcript:
${transcript}

Respond with JSON:
{
  "title": "...",
  "attendees": ["...", "..."],
  "date": "...",
  "estimatedDuration": "..."
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI that extracts metadata from meeting transcripts. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    console.log('✅ Metadata extracted');

    return result;

  } catch (error: any) {
    console.error('❌ Metadata extraction error:', error);
    return {
      title: 'Untitled Meeting',
      attendees: [],
      date: new Date().toISOString(),
      estimatedDuration: 'Unknown',
    };
  }
}

/**
 * Process meeting recording with deduplication
 */
export async function processMeetingRecording(
  audioBuffer: Buffer,
  userId: string,
  options: {
    title?: string;
    projectId?: string;
    attendeeIds?: string[];
    filename?: string;
    gcsPath?: string;
    fileHash?: string;
  } = {}
): Promise<string> {
  try {
    const filename = options.filename || 'recording.m4a';
    console.log(`🚀 Processing meeting recording: ${filename}`);

    // Generate file hash for deduplication
    const fileHash = options.fileHash || generateFileHash(audioBuffer);
    console.log(`🔐 File hash: ${fileHash.substring(0, 16)}...`);

    // Check for duplicates
    const duplicateCheck = await checkDuplicateFile(userId, fileHash, filename);

    if (duplicateCheck.isDuplicate) {
      console.log(`⚠️ Duplicate file detected! Existing meeting: ${duplicateCheck.existingMeetingId}`);
      throw new Error(
        `This file has already been processed. Existing meeting ID: ${duplicateCheck.existingMeetingId}`
      );
    }

    // Calculate file size
    const fileSizeBytes = audioBuffer.length;
    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
    console.log(`📦 File size: ${fileSizeMB} MB`);

    // Step 1: Transcribe audio
    const transcript = await transcribeAudio(audioBuffer, filename);
    const transcriptLength = transcript.length;
    console.log(`📝 Transcript length: ${transcriptLength} characters`);

    // Save transcript to GCS
    let gcsTranscriptPath: string | undefined;
    try {
      gcsTranscriptPath = await gcsStorage.saveTranscript(
        transcript,
        'temp-' + Date.now(), // Temporary ID, will update after meeting created
        userId
      );
    } catch (error) {
      console.warn('⚠️  Could not save transcript to GCS:', error);
    }

    // Step 2: Extract metadata
    const metadata = await extractMeetingMetadata(transcript);

    // Step 3: Generate summary
    const analysis = await generateMeetingSummary(transcript);

    // Step 4: Save to Firestore with deduplication fields
    const meetingData = {
      userId,

      // File information
      originalFilename: filename,
      fileHash,
      fileSizeBytes,
      fileSizeMB: parseFloat(fileSizeMB),
      gcsPath: options.gcsPath,
      gcsTranscriptPath,

      // Meeting details
      title: options.title || metadata.title || 'Untitled Meeting',
      date: metadata.date || new Date().toISOString(),
      duration: metadata.estimatedDuration,
      projectId: options.projectId || null,

      // Transcript
      transcript,
      transcriptLength,

      // AI Analysis
      summary: analysis.summary,
      keyPoints: analysis.keyPoints || [],
      decisions: analysis.decisions || [],
      actionItems: analysis.actionItems || [],
      nextSteps: analysis.nextSteps || [],

      // Attendees
      attendeeIds: options.attendeeIds || [],
      attendeeNames: metadata.attendees || [],

      // Timestamps
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const cleanData = removeUndefined(meetingData);
    const docRef = await db.collection('meeting_minutes').add(cleanData);

    // Update transcript with correct meeting ID
    if (gcsTranscriptPath) {
      try {
        const finalTranscriptPath = await gcsStorage.saveTranscript(
          transcript,
          docRef.id,
          userId,
          {
            title: metadata.title || options.title,
            date: metadata.date || new Date().toISOString(),
            duration: metadata.estimatedDuration,
            attendeeNames: metadata.attendees,
          }
        );

        // Update meeting with correct transcript path
        await docRef.update({ gcsTranscriptPath: finalTranscriptPath });

        // Delete temp transcript if different
        if (gcsTranscriptPath !== finalTranscriptPath) {
          await gcsStorage.deleteFile(gcsTranscriptPath).catch(() => { });
        }
      } catch (error) {
        console.warn('⚠️  Could not update transcript path:', error);
      }
    }

    console.log('✅ Meeting processed successfully:', docRef.id);
    console.log(`   📄 Filename: ${filename}`);
    console.log(`   🔐 Hash: ${fileHash.substring(0, 16)}...`);
    console.log(`   📊 Transcript: ${transcriptLength} chars`);
    console.log(`   💡 Key Points: ${analysis.keyPoints?.length || 0}`);
    console.log(`   ✅ Decisions: ${analysis.decisions?.length || 0}`);
    console.log(`   📋 Action Items: ${analysis.actionItems?.length || 0}`);

    return docRef.id;

  } catch (error: any) {
    console.error('❌ Meeting processing error:', error);
    throw error;
  }

  /**
 * Remove undefined values from object (prevents Firestore errors)
 */
  function removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return undefined;
    if (obj instanceof Date) return obj;

    if (Array.isArray(obj)) {
      return obj.map(removeUndefined).filter(item => item !== undefined);
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        const value = removeUndefined(obj[key]);
        if (value !== undefined) {
          cleaned[key] = value;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }

    return obj;
  }
}