import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

const REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
const BEDROCK_AGENT_ID = process.env.BEDROCK_AGENT_ID || '';
const BEDROCK_AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID || '';

const runtimeClient = new BedrockRuntimeClient({ region: REGION });
const agentClient = new BedrockAgentRuntimeClient({ region: REGION });

/**
 * Invoke a Bedrock foundation model (e.g. Claude) with a text prompt.
 */
export async function invokeModel(prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [{ role: 'user', content: prompt }];

  const body: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages,
  };

  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  const response = await runtimeClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content?.[0]?.text || '';
}

/**
 * Invoke a Bedrock Agent with a session and input text.
 * Returns the agent's text response.
 */
export async function invokeAgent(
  sessionId: string,
  inputText: string
): Promise<string> {
  if (!BEDROCK_AGENT_ID || !BEDROCK_AGENT_ALIAS_ID) {
    // Placeholder: return a mock response when agent is not configured
    return `[Mock Agent Response] I understood your request: "${inputText}". Agent not yet configured.`;
  }

  const command = new InvokeAgentCommand({
    agentId: BEDROCK_AGENT_ID,
    agentAliasId: BEDROCK_AGENT_ALIAS_ID,
    sessionId,
    inputText,
  });

  const response = await agentClient.send(command);

  // Collect streamed response
  let fullResponse = '';
  if (response.completion) {
    for await (const event of response.completion) {
      if (event.chunk?.bytes) {
        fullResponse += new TextDecoder().decode(event.chunk.bytes);
      }
    }
  }

  return fullResponse || '[No response from agent]';
}

/**
 * Build a system prompt for the kirana store assistant.
 */
export function buildKiranaSystemPrompt(storeName: string, language: string): string {
  return `You are Swar-Vani, a voice-first AI procurement assistant for Indian kirana (grocery) stores.

Current store: ${storeName}
Preferred language: ${language}

You help store owners:
1. Search for products by voice (Hindi, English, or mixed)
2. Check current inventory levels
3. Compare prices across suppliers (Udaan, Jumbotail, LocalMart)
4. Place orders with the best-priced supplier
5. Track order delivery status

Always be:
- Concise and practical (store owners are busy)
- Aware of Hindi/regional product names
- Proactive about low-stock alerts
- Helpful with price comparisons

Respond in ${language === 'hi' ? 'Hindi (Devanagari script)' : 'English'} unless the user switches language.`;
}
