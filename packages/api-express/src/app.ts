import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

import { callAI } from './services/ai.service.js';
import { markdownToHTML } from './services/markdown.service.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
});
app.use('/api/', limiter);

app.get('/health', (_req, res) => {
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

app.post('/api/llm/q', async (req, res) => {
  const { input, model, apiKey, maxTokens, temperature, systemPrompt } = req.body;

  if (!input) {
    return res.status(400).json({ error: 'El campo "input" es requerido' });
  }

  if (!model || !apiKey) {
    return res.status(400).json({ error: 'Debes configurar el modelo y API key en Configuración' });
  }

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');

    let fullResponse = '';
    let tokenCount = 0;

    await callAI(
      input,
      model,
      apiKey,
      { maxTokens, temperature, systemPrompt },
      [],
      (text) => {
        fullResponse += text;
        tokenCount++;
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      },
    );

    const processedAnswer = markdownToHTML(fullResponse);
    res.write(
      `data: ${JSON.stringify({
        done: true,
        respuesta: processedAnswer,
        modelo: model,
        tokens: tokenCount,
      })}\n\n`,
    );

    res.end();
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

app.use(errorHandler);

export default app;
