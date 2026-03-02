import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RegisterRequest, VerifyRequest, ApiResponse } from '../lib/types';
import { ulid } from 'ulid';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function respond(statusCode: number, body: unknown): ApiResponse {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

/**
 * POST /auth/register  — register a new store owner (mock)
 * POST /auth/verify    — verify OTP (mock)
 *
 * Placeholder implementation — returns mock tokens.
 * Will integrate with Cognito in a later phase.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return respond(200, {});
    }

    const path = event.path || '';

    if (path.endsWith('/register')) {
      return handleRegister(event);
    }

    if (path.endsWith('/verify')) {
      return handleVerify(event);
    }

    return respond(404, { error: 'Not found' });
  } catch (error) {
    console.error('Auth error:', error);
    return respond(500, { error: 'Internal server error' });
  }
}

async function handleRegister(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const body: RegisterRequest = JSON.parse(event.body || '{}');

  if (!body.phone) {
    return respond(400, { error: '"phone" is required' });
  }

  // Mock: In production, this would trigger Cognito SMS OTP
  const sessionId = ulid();

  return respond(200, {
    message: 'OTP sent to your phone (mock)',
    phone: body.phone,
    sessionId,
    // Mock OTP for development
    _devOtp: '123456',
  });
}

async function handleVerify(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const body: VerifyRequest = JSON.parse(event.body || '{}');

  if (!body.phone || !body.otp) {
    return respond(400, { error: '"phone" and "otp" are required' });
  }

  // Mock: Accept any OTP for now
  const storeId = ulid();
  const mockToken = `mock-jwt-${ulid()}`;

  return respond(200, {
    message: 'Authentication successful (mock)',
    storeId,
    token: mockToken,
    expiresIn: 86400,
    _note: 'This is a mock token. Cognito integration coming in Phase 2.',
  });
}
