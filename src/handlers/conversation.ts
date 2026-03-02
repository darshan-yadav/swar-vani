import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { putItem, getItem, updateItem } from '../lib/dynamo';
import {
  Conversation,
  StartConversationRequest,
  SendMessageRequest,
  ConversationMessage,
  ConversationAction,
  ApiResponse,
} from '../lib/types';
import { ulid } from 'ulid';
import {
  runConversationPipeline,
  persistConversationUpdate,
} from '../lib/conversation-engine';
import { getProactiveAlerts } from '../lib/proactive-alerts';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function respond(statusCode: number, body: unknown): ApiResponse {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return respond(200, {});
    }

    const path = event.path || '';

    if (path.endsWith('/message')) {
      return handleSendMessage(event);
    }

    if (event.httpMethod === 'POST') {
      return handleStartConversation(event);
    }

    return respond(405, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Conversation error:', error);
    return respond(500, { error: 'Internal server error' });
  }
}

async function handleStartConversation(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const body: StartConversationRequest = JSON.parse(event.body || '{}');

  if (!body.storeId) {
    return respond(400, { error: '"storeId" is required' });
  }

  const language = body.language || 'hi';
  const conversationId = ulid();

  const store = await getItem<Record<string, unknown>>('STORE#' + body.storeId, 'PROFILE');
  const storeName = (store?.name as string) || 'आपकी दुकान';
  const ownerName = (store?.owner_name as string) || 'सेठजी';

  const isHindi = language.startsWith('hi');

  const welcomeMessage: ConversationMessage = {
    role: 'assistant',
    text: isHindi
      ? 'नमस्ते ' + ownerName + '! मैं रामू काका हूँ, आपका AI खरीदारी सहायक। ' + storeName + ' के लिए आज क्या करना है? स्टॉक चेक, ऑर्डर, या समरी — बस बोलो!'
      : 'Hello ' + ownerName + '! I\'m Ramu Kaka, your AI procurement assistant for ' + storeName + '. What do you need today? Stock check, orders, or summary — just say it!',
    timestamp: new Date().toISOString(),
  };

  // Append proactive alerts to welcome message
  try {
    const alerts = await getProactiveAlerts(body.storeId);
    if (alerts.length > 0) {
      const alertText = alerts.join('\n');
      welcomeMessage.text += '\n\n' + alertText;
    }
  } catch (e) {
    console.error('Proactive alerts failed:', e);
  }

  const conversation: Record<string, unknown> = {
    PK: 'STORE#' + body.storeId,
    SK: 'CONV#' + conversationId,
    entityType: 'CONVERSATION',
    storeId: body.storeId,
    conversationId,
    language,
    transcript: [welcomeMessage],
    actions: [],
    status: 'ACTIVE',
  };

  await putItem(conversation);

  return respond(201, {
    conversationId,
    storeId: body.storeId,
    language,
    status: 'ACTIVE',
    messages: [welcomeMessage],
  });
}

async function handleSendMessage(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const conversationId = event.pathParameters?.id;

  if (!conversationId) {
    return respond(400, { error: 'Conversation ID is required' });
  }

  const body: SendMessageRequest = JSON.parse(event.body || '{}');

  if (!body.text) {
    return respond(400, { error: '"text" is required' });
  }

  const storeId =
    event.queryStringParameters?.storeId ||
    (JSON.parse(event.body || '{}') as Record<string, string>).storeId ||
    (event.headers?.['X-Store-Id']) ||
    (event.headers?.['x-store-id']) ||
    'store-001';

  const conversation = await getItem<Conversation>(
    'STORE#' + storeId,
    'CONV#' + conversationId,
  );

  if (!conversation) {
    return respond(404, { error: 'Conversation ' + conversationId + ' not found' });
  }

  if (conversation.status !== 'ACTIVE') {
    return respond(400, { error: 'Conversation is closed' });
  }

  const userMessage: ConversationMessage = {
    role: 'user',
    text: body.text,
    timestamp: new Date().toISOString(),
  };

  // Run the Ramu Kaka conversation pipeline
  const { assistantText, actionRecord } = await runConversationPipeline(body.text, storeId);

  const assistantMessage: ConversationMessage = {
    role: 'assistant',
    text: assistantText,
    timestamp: new Date().toISOString(),
  };

  await persistConversationUpdate(storeId, conversationId, conversation, userMessage, assistantMessage, actionRecord);

  return respond(200, {
    conversationId,
    userMessage,
    assistantMessage,
    action: actionRecord,
    totalMessages: conversation.transcript.length + 2,
  });
}
