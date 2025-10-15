import OpenAI from 'openai';
import admin, { db } from './firebase';
import crypto from 'crypto';

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
  try {
    console.log(`🎤 Transcribing audio: ${filename}`);
    
    // Create a File object from buffer
    const file = new File([audioBuffer], filename, { 
      type: 'audio/mpeg' 
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
    });

    console.log('✅ Transcription complete');
    return transcription.text;

  } catch (error: any) {
    console.error('❌ Transcription error:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Generate meeting summary using GPT-4
 */
export async function generateMeetingSummary(transcript: string): Promise<any> {
  try {
    console.log('🤖 Generating meeting summary with GPT-4...');

    const prompt = `Analyze this meeting transcript and provide:

1. A brief summary (2-3 sentences)
2. Key points discussed (bullet points)
3. Decisions made (if any)
4. Action items with assignees (if mentioned)
5. Next steps

Transcript:
${transcript}

Format your response as JSON with the following structure:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "decisions": ["...", "..."],
  "actionItems": [
    {
      "task": "...",
      "assignee": "...",
      "dueDate": "..."
    }
  ],
  "nextSteps": ["...", "..."]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes meeting transcripts and extracts structured information. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
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
  } = {}
): Promise<string> {
  try {
    const filename = options.filename || 'recording.m4a';
    console.log(`🚀 Processing meeting recording: ${filename}`);

    // Generate file hash for deduplication
    const fileHash = generateFileHash(audioBuffer);
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

    const docRef = await db.collection('meeting_minutes').add(meetingData);

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
}