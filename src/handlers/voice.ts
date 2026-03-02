/**
 * Voice handler — POST /conversation/{id}/audio
 *
 * Flow:
 * 1. Decode base64 audio → upload to S3
 * 2. Amazon Transcribe (batch, hi-IN) → Hindi text
 * 3. Conversation engine (intent + DynamoDB + response)
 * 4. Amazon Polly (Kajal, neural, Hindi) → MP3
 * 5. Upload MP3 to S3, generate presigned URL
 * 6. Return { transcribedText, responseText, audioUrl, action }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { getItem } from '../lib/dynamo';
import { Conversation, ConversationMessage, ApiResponse } from '../lib/types';
import {
  runConversationPipeline,
  persistConversationUpdate,
} from '../lib/conversation-engine';

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET_NAME = process.env.BUCKET_NAME || 'swar-vani-audio';

const s3Client = new S3Client({ region: REGION });
const transcribeClient = new TranscribeClient({ region: REGION });
const pollyClient = new PollyClient({ region: REGION });

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

// Only add manual CORS headers when invoked via API Gateway (not Function URL)
function getHeaders(event: any): Record<string, string> {
  if (event.requestContext?.http) {
    // Lambda Function URL — CORS handled automatically by Function URL config
    return { 'Content-Type': 'application/json' };
  }
  // API Gateway — need manual CORS headers
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Store-Id',
  };
}

let _currentEvent: any = null;

function respond(statusCode: number, body: unknown): ApiResponse {
  return { statusCode, headers: getHeaders(_currentEvent), body: JSON.stringify(body) };
}

// ─── Normalize event from API Gateway or Lambda Function URL ───

function normalizeEvent(event: any): {
  method: string;
  path: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
} {
  // Lambda Function URL event
  if (event.requestContext?.http) {
    const rawPath = event.rawPath || '';
    // Extract conversation ID from path: /conversation/{id}/audio
    const match = rawPath.match(/\/conversation\/([^/]+)\/audio/);
    return {
      method: event.requestContext.http.method,
      path: rawPath,
      pathParams: match ? { id: match[1] } : {},
      queryParams: event.queryStringParameters || {},
      headers: event.headers || {},
      body: event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : (event.body || null),
    };
  }
  // API Gateway event
  return {
    method: event.httpMethod,
    path: event.path,
    pathParams: event.pathParameters || {},
    queryParams: event.queryStringParameters || {},
    headers: event.headers || {},
    body: event.body || null,
  };
}

// ─── Main handler ───

export async function handler(event: any): Promise<APIGatewayProxyResult> {
  _currentEvent = event;
  const normalized = normalizeEvent(event);
  console.log('Voice handler invoked, method:', normalized.method, 'path:', normalized.path);

  if (normalized.method === 'OPTIONS') {
    return respond(200, {});
  }

  try {
    const conversationId = normalized.pathParams?.id;
    if (!conversationId) {
      return respond(400, { error: 'Conversation ID is required in path' });
    }

    const body = JSON.parse(normalized.body || '{}');
    const { audio, format, language } = body as { audio?: string; format?: string; language?: string };

    if (!audio) {
      return respond(400, { error: '"audio" (base64 encoded) is required' });
    }

    const audioFormat = format || 'webm';
    const storeId =
      normalized.queryParams?.storeId ||
      body.storeId ||
      normalized.headers?.['X-Store-Id'] ||
      normalized.headers?.['x-store-id'] ||
      'store-001';

    // Validate conversation exists
    const conversation = await getItem<Conversation>(
      `STORE#${storeId}`,
      `CONV#${conversationId}`,
    );

    if (!conversation) {
      return respond(404, { error: `Conversation ${conversationId} not found` });
    }

    if (conversation.status !== 'ACTIVE') {
      return respond(400, { error: 'Conversation is closed' });
    }

    const timestamp = Date.now();

    // ── Step 1: Decode & upload audio to S3 ──
    console.log('Step 1: Uploading audio to S3');
    const audioBuffer = Buffer.from(audio, 'base64');
    const inputKey = `conversations/${conversationId}/input-${timestamp}.${audioFormat}`;

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: inputKey,
      Body: audioBuffer,
      ContentType: audioFormat === 'webm' ? 'audio/webm' : `audio/${audioFormat}`,
    }));
    console.log('Audio uploaded to S3:', inputKey, 'Size:', audioBuffer.length);

    // ── Step 2: Transcribe audio to text ──
    console.log('Step 2: Starting transcription');
    const jobName = `swar-vani-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    const transcriptionOutputKey = `transcriptions/${jobName}.json`;

    // Use user's selected language as primary for better accuracy
    // Map language code to Transcribe language code
    const LANG_TO_TRANSCRIBE: Record<string, string> = {
      'hi': 'hi-IN', 'en': 'en-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'kn': 'kn-IN', 'mr': 'mr-IN',
    };
    const primaryLang = LANG_TO_TRANSCRIBE[language || 'hi'] || 'hi-IN';

    // Use single-language mode with the user's selected language for better accuracy
    // IdentifyMultipleLanguages confuses similar-sounding languages
    await transcribeClient.send(new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: primaryLang as any,
      MediaFormat: audioFormat as 'webm' | 'mp3' | 'wav' | 'ogg' | 'flac',
      Media: { MediaFileUri: `s3://${BUCKET_NAME}/${inputKey}` },
      OutputBucketName: BUCKET_NAME,
      OutputKey: transcriptionOutputKey,
    }));

    // Poll for completion (max 45 seconds)
    let transcriptionStatus = 'IN_PROGRESS';
    const maxWaitMs = 45_000;
    const startTime = Date.now();

    while (transcriptionStatus === 'IN_PROGRESS' && (Date.now() - startTime) < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 1500));
      const result = await transcribeClient.send(new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      }));
      transcriptionStatus = result.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';
      console.log('Transcription status:', transcriptionStatus);
    }

    if (transcriptionStatus !== 'COMPLETED') {
      console.error('Transcription failed or timed out. Status:', transcriptionStatus);
      return respond(500, { error: 'Audio transcription failed. Please try again.' });
    }

    // Read transcript from S3
    const transcriptResponse = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: transcriptionOutputKey,
    }));
    const transcriptBody = await transcriptResponse.Body!.transformToString();
    const transcriptJson = JSON.parse(transcriptBody);
    const transcribedText = transcriptJson.results?.transcripts?.[0]?.transcript || '';

    console.log('Transcribed text:', transcribedText);

    if (!transcribedText.trim()) {
      return respond(200, {
        conversationId,
        transcribedText: '',
        responseText: 'माफ़ कीजिए, मैं आपकी आवाज़ सुन नहीं पाया। कृपया दोबारा बोलें।',
        audioUrl: null,
        action: null,
      });
    }

    // ── Step 3: Process with conversation engine ──
    console.log('Step 3: Running conversation pipeline');
    const { assistantText, actionRecord } = await runConversationPipeline(transcribedText, storeId, language || 'hi');

    // ── Step 4: Generate voice response with Polly (language-aware) ──
    console.log('Step 4: Generating Polly speech');

    // Map user's selected language code to Polly language code
    const LANG_TO_POLLY: Record<string, string> = {
      'hi': 'hi-IN', 'en': 'en-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'kn': 'kn-IN', 'mr': 'hi-IN',
    };
    const preferredLang = LANG_TO_POLLY[language || 'hi'] || 'hi-IN';
    console.log('User selected language:', language, '→ Polly lang:', preferredLang);

    // Polly voice mapping — only Hindi and English have neural voices
    const POLLY_VOICES: Record<string, { voiceId: string; engine: 'neural' | 'standard'; langCode: string } | null> = {
      'hi-IN': { voiceId: 'Kajal', engine: 'neural', langCode: 'hi-IN' },
      'en-IN': { voiceId: 'Kajal', engine: 'neural', langCode: 'en-IN' },
      'en-US': { voiceId: 'Kajal', engine: 'neural', langCode: 'en-IN' },
      'ta-IN': null, // No neural Tamil voice — return text only
      'te-IN': null, // No neural Telugu voice — return text only
      'kn-IN': null, // No neural Kannada voice — return text only
    };

    // Use user's preferred language, not Transcribe's detection
    const pollyVoice = POLLY_VOICES[preferredLang] ?? POLLY_VOICES['hi-IN'];
    let audioUrl: string | null = null;

    if (pollyVoice) {
      const pollyResult = await pollyClient.send(new SynthesizeSpeechCommand({
        Text: assistantText,
        OutputFormat: 'mp3',
        VoiceId: pollyVoice.voiceId,
        Engine: pollyVoice.engine,
        LanguageCode: pollyVoice.langCode,
      }));

      // Convert AudioStream to Buffer
      const audioChunks: Uint8Array[] = [];
      if (pollyResult.AudioStream) {
        const stream = pollyResult.AudioStream as AsyncIterable<Uint8Array>;
        for await (const chunk of stream) {
          audioChunks.push(chunk);
        }
      }
      const responseAudioBuffer = Buffer.concat(audioChunks);

      // Upload response MP3 to S3
      const responseKey = `conversations/${conversationId}/response-${timestamp}.mp3`;
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: responseKey,
        Body: responseAudioBuffer,
        ContentType: 'audio/mpeg',
      }));

      // Generate presigned URL (5 minutes)
      audioUrl = await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: responseKey,
      }), { expiresIn: 300 });

      console.log('Response audio uploaded:', responseKey);
    } else {
      console.log('Skipping Polly — no neural voice for', preferredLang, '(returning text only)');
    }

    // ── Step 5: Persist to DynamoDB ──
    const userMessage: ConversationMessage = {
      role: 'user',
      text: transcribedText,
      timestamp: new Date().toISOString(),
    };
    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      text: assistantText,
      timestamp: new Date().toISOString(),
    };

    await persistConversationUpdate(
      storeId,
      conversationId,
      conversation,
      userMessage,
      assistantMessage,
      actionRecord,
    );

    // ── Step 6: Return response ──
    return respond(200, {
      conversationId,
      transcribedText,
      responseText: assistantText,
      audioUrl,
      action: actionRecord,
    });

  } catch (error) {
    console.error('Voice handler error:', error);
    return respond(500, { error: 'Internal server error processing voice input' });
  }
}
