import request from 'supertest';
import { describe, it, expect, beforeEach } from '@jest/globals';
import app from '../src/app.js';

jest.mock('../src/services/auth.service.js', () => ({
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  verifyToken: jest.fn().mockResolvedValue({ userId: 'test-user-id', email: 'test@example.com' }),
  getUserById: jest.fn(),
}));

jest.mock('../src/services/encryption.service.js', () => ({
  encrypt: jest.fn((text: string) => `encrypted:${text}`),
  decrypt: jest.fn((text: string) => text?.replace('encrypted:', '') || null),
}));

jest.mock('../src/services/ai.service.js', () => ({
  MODEL_DEFAULTS: { 'gemini-2.5-flash': { maxTokens: 8192, temperature: 0.7 } },
  callAI: jest.fn().mockResolvedValue('Mock AI response'),
}));

jest.mock('../src/services/google-auth.service.js', () => ({
  googleAuth: jest.fn(),
}));

import prisma from '../src/config/db.js';
import * as authService from '../src/services/auth.service.js';

const p = prisma as any;

const authHeader = 'Bearer test-jwt-token';

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      (authService.register as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        name: 'New User',
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'password123', name: 'New User' });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('new@example.com');
    });

    it('should return 400 when email missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email');
    });

    it('should return 400 when password too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('6 caracteres');
    });

    it('should return 500 for duplicate email', async () => {
      (authService.register as jest.Mock).mockRejectedValue(new Error('El email ya está registrado'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: 'password123' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error interno del servidor');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        token: 'jwt-token',
        user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it('should return 400 when email missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
    });

    it('should return 500 for invalid credentials', async () => {
      (authService.login as jest.Mock).mockRejectedValue(new Error('Credenciales inválidas'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'password123' });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user', async () => {
      (authService.getUserById as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
    });

    it('should return 401 without auth header', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });
});

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/config', () => {
    it('should return user config', async () => {
      p.userConfig.findUnique.mockResolvedValue({
        theme: 'dark',
        language: 'es',
        streamSpeed: 5,
        showTitle: false,
        autoDeleteDays: null,
      });

      const response = await request(app)
        .get('/api/users/config')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.theme).toBe('dark');
    });

    it('should return defaults when no config', async () => {
      p.userConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/config')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.theme).toBe('system');
    });
  });

  describe('PATCH /api/users/config', () => {
    it('should update config', async () => {
      p.userConfig.upsert.mockResolvedValue({
        theme: 'dark',
        language: 'es',
        autoDeleteDays: 30,
      });

      const response = await request(app)
        .patch('/api/users/config')
        .set('Authorization', authHeader)
        .send({ theme: 'dark', autoDeleteDays: 30 });

      expect(response.status).toBe(200);
    });
  });
});

describe('Conversations Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/conversations', () => {
    it('should return conversations list', async () => {
      p.userConfig.findUnique.mockResolvedValue(null);
      p.conversation.findMany.mockResolvedValue([
        { id: 'conv-1', title: 'Test', modelId: 'gemini-2.5-flash', provider: 'google', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /api/conversations/count', () => {
    it('should return conversation count', async () => {
      p.conversation.count.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/conversations/count')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(5);
    });
  });

  describe('POST /api/conversations', () => {
    it('should create a conversation', async () => {
      p.conversation.count.mockResolvedValue(0);
      p.conversation.create.mockResolvedValue({
        id: 'conv-new',
        title: 'Nueva conversación',
        modelId: 'gemini-2.5-flash',
        provider: 'google',
      });

      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', authHeader)
        .send({ modelId: 'gemini-2.5-flash', provider: 'google' });

      expect(response.status).toBe(201);
    });

    it('should return 400 when modelId missing', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', authHeader)
        .send({ provider: 'google' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('should return conversation messages', async () => {
      p.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        userId: 'test-user-id',
        messages: [{ id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() }],
      });

      const response = await request(app)
        .get('/api/conversations/conv-1/messages')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should return 404 for unknown conversation', async () => {
      p.conversation.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/conversations/unknown-id/messages')
        .set('Authorization', authHeader);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/conversations/:id', () => {
    it('should update conversation title', async () => {
      p.conversation.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .patch('/api/conversations/conv-1')
        .set('Authorization', authHeader)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(200);
    });

    it('should return 404 when conversation not found', async () => {
      p.conversation.updateMany.mockResolvedValue({ count: 0 });

      const response = await request(app)
        .patch('/api/conversations/unknown-id')
        .set('Authorization', authHeader)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/conversations/:id', () => {
    it('should delete a conversation', async () => {
      p.conversation.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .delete('/api/conversations/conv-1')
        .set('Authorization', authHeader);

      expect(response.status).toBe(200);
    });
  });
});

describe('Messages Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/messages', () => {
    it('should send a message successfully', async () => {
      p.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        userId: 'test-user-id',
        title: 'Test',
        modelId: 'gemini-2.5-flash',
        provider: 'google',
      });
      p.modelConfig.findUnique.mockResolvedValue({
        id: 'model-1',
        userId: 'test-user-id',
        modelId: 'gemini-2.5-flash',
        apiKeyEnc: 'encrypted:test-key',
        isActive: true,
      });
      p.message.create
        .mockResolvedValueOnce({ id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() })
        .mockResolvedValueOnce({ id: 'msg-2', role: 'assistant', content: 'Hi there!', createdAt: new Date() });
      p.message.findMany.mockResolvedValue([]);
      p.conversation.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authHeader)
        .send({ conversationId: 'conv-1', content: 'Hello', modelId: 'gemini-2.5-flash' });

      expect(response.status).toBe(200);
      expect(response.body.userMessage).toBeDefined();
      expect(response.body.assistantMessage).toBeDefined();
    });

    it('should return 400 when conversationId missing', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authHeader)
        .send({ content: 'Hello' });

      expect(response.status).toBe(400);
    });

    it('should use provided assistantMessage when given', async () => {
      p.conversation.findFirst.mockResolvedValue({
        id: 'conv-1',
        userId: 'test-user-id',
        title: 'Test',
        modelId: 'gemini-2.5-flash',
        provider: 'google',
      });
      p.modelConfig.findUnique.mockResolvedValue({
        id: 'model-1',
        userId: 'test-user-id',
        modelId: 'gemini-2.5-flash',
        apiKeyEnc: 'encrypted:test-key',
        isActive: true,
      });
      p.message.create
        .mockResolvedValueOnce({ id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() })
        .mockResolvedValueOnce({ id: 'msg-2', role: 'assistant', content: 'Pre-generated response', createdAt: new Date() });
      p.conversation.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authHeader)
        .send({
          conversationId: 'conv-1',
          content: 'Hello',
          modelId: 'gemini-2.5-flash',
          assistantMessage: 'Pre-generated response',
        });

      expect(response.status).toBe(200);
      expect(response.body.assistantMessage.content).toBe('Pre-generated response');
    });
  });
});
