import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const MODEL_DEFAULTS = {
  "gemini-2.5-flash": { maxTokens: 4096, temperature: 0.7 },
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo": { maxTokens: 4096, temperature: 0.7 },
  "llama-3.3-70b-versatile": { maxTokens: 4096, temperature: 0.7 },
  "mistral-small": { maxTokens: 4096, temperature: 0.7 }
};

export async function callAI(input, model, apiKey, options = {}) {
  const defaults = MODEL_DEFAULTS[model] || { maxTokens: 4096, temperature: 0.7 };
  const maxTokens = options.maxTokens || defaults.maxTokens;
  const temperature = options.temperature ?? defaults.temperature;
  const systemPrompt = options.systemPrompt;

  const messages = [];
  if (systemPrompt && systemPrompt.trim()) {
    messages.push(new SystemMessage(systemPrompt));
  }
  messages.push(new HumanMessage(input));

  let llm;

  if (model === "gemini-2.5-flash") {
    llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: apiKey,
      maxOutputTokens: maxTokens,
      temperature: temperature,
      maxRetries: 0
    });
  } else if (model === "mistral-small") {
    llm = new ChatMistralAI({
      model: "mistral-small-latest",
      apiKey: apiKey,
      maxTokens: maxTokens,
      temperature: temperature,
      maxRetries: 0
    });
  } else if (model === "llama-3.3-70b-versatile") {
    llm = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: apiKey,
      maxTokens: maxTokens,
      temperature: temperature,
      maxRetries: 0
    });
  } else if (model === "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo") {
    llm = new ChatGroq({
      model: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
      apiKey: apiKey,
      maxTokens: maxTokens,
      temperature: temperature,
      maxRetries: 0
    });
  } else {
    throw new Error(`Modelo no soportado: ${model}`);
  }

  const chunks = [];
  for await (const chunk of await llm.stream(messages)) {
    chunks.push(chunk.content || "");
  }

  return chunks.join("");
}