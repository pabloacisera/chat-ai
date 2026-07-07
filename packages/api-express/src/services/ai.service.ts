import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

export const MODEL_DEFAULTS = {
  'gemini-2.5-flash': { maxTokens: 4096, temperature: 0.7 },
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { maxTokens: 4096, temperature: 0.7 },
  'llama-3.3-70b-versatile': { maxTokens: 4096, temperature: 0.7 },
  'mistral-small': { maxTokens: 4096, temperature: 0.7 },
};

export function createChatModel(model: string, apiKey: string, maxTokens: number, temperature: number) {
  if (model === 'gemini-2.5-flash') {
    return new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      apiKey,
      maxOutputTokens: maxTokens,
      temperature,
      maxRetries: 0,
    });
  } else if (model === 'mistral-small') {
    return new ChatMistralAI({
      model: 'mistral-small-latest',
      apiKey,
      maxTokens,
      temperature,
      maxRetries: 0,
    });
  } else if (model === 'llama-3.3-70b-versatile') {
    return new ChatGroq({
      model: 'llama-3.3-70b-versatile',
      apiKey,
      maxTokens,
      temperature,
      maxRetries: 0,
    });
  } else if (model === 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo') {
    return new ChatGroq({
      model: 'meta-llama/Llama-3.1-8B-Instruct-Turbo',
      apiKey,
      maxTokens,
      temperature,
      maxRetries: 0,
    });
  }
  throw new Error(`Modelo no soportado: ${model}`);
}

interface CallAIOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export async function callAI(
  input: string,
  model: string,
  apiKey: string,
  options: CallAIOptions = {},
  history: Array<{ role: string; content: string }> = [],
  onChunk?: (text: string) => void,
) {
  const defaults = MODEL_DEFAULTS[model] || { maxTokens: 4096, temperature: 0.7 };
  const maxTokens = options.maxTokens || defaults.maxTokens;
  const temperature = options.temperature ?? defaults.temperature;
  const systemPrompt = options.systemPrompt;

  const messages: BaseMessage[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push(new SystemMessage(systemPrompt));
  }

  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else {
      messages.push(new AIMessage(msg.content));
    }
  }

  messages.push(new HumanMessage(input));

  const llm = createChatModel(model, apiKey, maxTokens, temperature);

  const chunks: string[] = [];
  for await (const chunk of await llm.stream(messages)) {
    const text = (chunk.content as string) || '';
    chunks.push(text);
    if (onChunk) onChunk(text);
  }

  return chunks.join('');
}
