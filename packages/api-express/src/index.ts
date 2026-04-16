// @ts-nocheck
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.EXPRESS_PORT || 3000;

app.use(cors());
app.use(express.json());

const MODEL_DEFAULTS: Record<string, { maxTokens: number; temperature: number }> = {
  "gemini-2.5-flash": { maxTokens: 4096, temperature: 0.7 },
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo": { maxTokens: 4096, temperature: 0.7 },
  "llama-3.3-70b-versatile": { maxTokens: 4096, temperature: 0.7 },
  "mistral-small": { maxTokens: 4096, temperature: 0.7 }
};

app.post('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const simpleMarkdownToHTML = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  let html = text;
  
  html = html.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^(\d+)\.\s+(.*)$/gm, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');
  html = html.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  if (!html.startsWith('<p>') && !html.startsWith('<ul>') && !html.startsWith('<ol>')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
};

app.post("/llm/q", async (req, res) => {
  const { input, model, apiKey, maxTokens, temperature, systemPrompt } = req.body;
  
  if (!input) {
    return res.status(400).json({ error: 'El campo "input" es requerido' });
  }
  
  if (!model || !apiKey) {
    return res.status(400).json({ error: 'Debes configurar el modelo y API key en Configuración' });
  }
  
  const defaults = MODEL_DEFAULTS[model] || { maxTokens: 4096, temperature: 0.7 };
  const finalMaxTokens = maxTokens || defaults.maxTokens;
  const finalTemperature = temperature ?? defaults.temperature;
  
  try {
    let llm;
    const messages = [];
    
    if (systemPrompt && systemPrompt.trim()) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(input));
    
    if (model === "gemini-2.5-flash") {
      llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: apiKey,
        maxOutputTokens: finalMaxTokens,
        temperature: finalTemperature,
        maxRetries: 0 // No reintentar para evitar timeouts si no hay cuota
      });
    } else if (model === "mistral-small") {
      llm = new ChatMistralAI({
        model: "mistral-small-latest",
        apiKey: apiKey,
        maxTokens: finalMaxTokens,
        temperature: finalTemperature,
        maxRetries: 0
      });
    } else if (model === "llama-3.3-70b-versatile") {
      llm = new ChatGroq({
        model: "llama-3.3-70b-versatile",
        apiKey: apiKey,
        maxTokens: finalMaxTokens,
        temperature: finalTemperature,
        maxRetries: 0
      });
    } else if (model === "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo") {
      llm = new ChatGroq({
        model: "meta-llama/Llama-3.1-8B-Instruct-Turbo",
        apiKey: apiKey,
        maxTokens: finalMaxTokens,
        temperature: finalTemperature,
        maxRetries: 0
      });
    } else {
      return res.status(400).json({ error: `Modelo no soportado: ${model}` });
    }
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    let fullResponse = "";
    let tokenCount = 0;
    
    for await (const chunk of await llm.stream(messages)) {
      const text = chunk.content || "";
      if (text) {
        fullResponse += text;
        tokenCount++;
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      }
    }
    
    const processedAnswer = simpleMarkdownToHTML(fullResponse);
    res.write(`data: ${JSON.stringify({ 
      done: true, 
      respuesta: processedAnswer,
      modelo: model,
      tokens: tokenCount
    })}\n\n`);
    
    res.end();
    
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});