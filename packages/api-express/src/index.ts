// @ts-nocheck
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import modelsRoutes from './routes/models.routes.js';
import conversationsRoutes from './routes/conversations.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import anonRoutes from './routes/anon.routes.js';
import syncRoutes from './routes/sync.routes.js';
import archiveRoutes from './routes/archive.routes.js';
import errorHandler from './middleware/errorHandler.js';

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.EXPRESS_PORT || 3000;

app.use(cors());
app.use(express.json());

const MODEL_DEFAULTS = {
  "gemini-2.5-flash": { maxTokens: 4096, temperature: 0.7 },
  "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo": { maxTokens: 4096, temperature: 0.7 },
  "llama-3.3-70b-versatile": { maxTokens: 4096, temperature: 0.7 },
  "mistral-small": { maxTokens: 4096, temperature: 0.7 }
};

const simpleMarkdownToHTML = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  let html = text;

  html = html.replace(/&/g, '&amp;');
  
  html = html.replace(/\*\*(.*?)\*\*/g, '~~MARK~~strong~~MARK~~$1~~MARK~~/strong~~MARK~~');
  html = html.replace(/\*(.*?)\*/g, '~~MARK~~em~~MARK~~$1~~MARK~~/em~~MARK~~');
  
  html = html.replace(/^### (.+)$/gm, '~~MARK~~h3~~MARK~~$1~~MARK~~/h3~~MARK~~');
  html = html.replace(/^## (.+)$/gm, '~~MARK~~h2~~MARK~~$1~~MARK~~/h2~~MARK~~');
  html = html.replace(/^# (.+)$/gm, '~~MARK~~h1~~MARK~~$1~~MARK~~/h1~~MARK~~');
  
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '~~MARK~~li~~MARK~~$2~~MARK~~/li~~MARK~~');
  html = html.replace(/(~~MARK~~li~~MARK~~.*?~~MARK~~\/li~~MARK~~\n?)+/g, (match) => {
    return '~~MARK~~ol~~MARK~~' + match.replace(/~~MARK~~li~~MARK~~/g, '').replace(/~~MARK~~\/li~~MARK~~/g, '') + '~~MARK~~/ol~~MARK~~';
  });
  
  html = html.replace(/^[-*]\s+(.+)$/gm, '~~MARK~~li~~MARK~~$1~~MARK~~/li~~MARK~~');
  html = html.replace(/(~~MARK~~li~~MARK~~.*?~~MARK~~\/li~~MARK~~\n?)+/g, (match) => {
    return '~~MARK~~ul~~MARK~~' + match.replace(/~~MARK~~li~~MARK~~/g, '').replace(/~~MARK~~\/li~~MARK~~/g, '') + '~~MARK~~/ul~~MARK~~';
  });

  html = html.replace(/---/g, '~~MARK~~hr~~MARK~~');
  
  html = html.replace(/\n\n/g, '~~MARK~~br~~MARK~~~~MARK~~br~~MARK~~');
  html = html.replace(/\n/g, ' ');
  
  html = html
    .replace(/~~MARK~~strong~~MARK~~/g, '<strong>')
    .replace(/~~MARK~~\/strong~~MARK~~/g, '</strong>')
    .replace(/~~MARK~~em~~MARK~~/g, '<em>')
    .replace(/~~MARK~~\/em~~MARK~~/g, '</em>')
    .replace(/~~MARK~~h1~~MARK~~/g, '<h1>')
    .replace(/~~MARK~~\/h1~~MARK~~/g, '</h1>')
    .replace(/~~MARK~~h2~~MARK~~/g, '<h2>')
    .replace(/~~MARK~~\/h2~~MARK~~/g, '</h2>')
    .replace(/~~MARK~~h3~~MARK~~/g, '<h3>')
    .replace(/~~MARK~~\/h3~~MARK~~/g, '</h3>')
    .replace(/~~MARK~~li~~MARK~~/g, '<li>')
    .replace(/~~MARK~~\/li~~MARK~~/g, '</li>')
    .replace(/~~MARK~~ol~~MARK~~/g, '<ol>')
    .replace(/~~MARK~~\/ol~~MARK~~/g, '</ol>')
    .replace(/~~MARK~~ul~~MARK~~/g, '<ul>')
    .replace(/~~MARK~~\/ul~~MARK~~/g, '</ul>')
    .replace(/~~MARK~~br~~MARK~~/g, '<br>')
    .replace(/~~MARK~~hr~~MARK~~/g, '<hr>');

  if (!html.startsWith('<h1>') && !html.startsWith('<h2>') && !html.startsWith('<h3>') && 
      !html.startsWith('<ul>') && !html.startsWith('<ol>') && !html.startsWith('<p>')) {
    html = `<p>${html}</p>`;
  }
  
  return html;
};

app.post('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/anon', anonRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/archive', archiveRoutes);

app.post("/api/llm/q", async (req, res) => {
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
        maxRetries: 0
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
        const htmlChunk = simpleMarkdownToHTML(text);
        res.write(`data: ${JSON.stringify({ chunk: htmlChunk })}\n\n`);
      }
    }
    
    const processedAnswer = fullResponse;
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

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});