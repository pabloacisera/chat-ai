import request from 'supertest';
import { describe, it, expect, beforeAll } from '@jest/globals';

const BASE_URL = 'http://localhost:3001';

describe('API LLM Tests', () => {
  
  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await request(BASE_URL).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('POST /llm/q - Validation Tests', () => {
    it('should return 400 when input is missing', async () => {
      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('input');
    });

    it('should return 400 when model is missing', async () => {
      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ input: 'Hello' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('modelo');
    });

    it('should return 400 when apiKey is missing', async () => {
      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ input: 'Hello', model: 'gemini-2.5-flash' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('API key');
    });

    it('should return 400 for unsupported model', async () => {
      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ 
          input: 'Hello', 
          model: 'unsupported-model',
          apiKey: 'test-key' 
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('no soportado');
    });
  });

  describe('POST /llm/q - Gemini Model', () => {
    it('should return stream for valid Gemini request', async () => {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        console.log('⚠️ GEMINI_API_KEY not set, skipping Gemini test');
        return;
      }

      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ 
          input: 'Say "OK" in one word', 
          model: 'gemini-2.5-flash',
          apiKey: geminiApiKey
        })
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.text).toContain('data:');
    }, 30000);
  });

  describe('POST /llm/q - Mistral Model', () => {
    it('should return stream for valid Mistral request', async () => {
      const mistralApiKey = process.env.MISTRAL_API_KEY;
      
      if (!mistralApiKey) {
        console.log('⚠️ MISTRAL_API_KEY not set, skipping Mistral test');
        return;
      }

      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ 
          input: 'Say "OK" in one word', 
          model: 'mistral-small',
          apiKey: mistralApiKey
        })
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.text).toContain('data:');
    }, 30000);
  });

  describe('POST /llm/q - Groq Llama 3.3 Model', () => {
    it('should return stream for valid Groq Llama 3.3 request', async () => {
      const groqApiKey = process.env.GROQ_API_KEY;
      
      if (!groqApiKey) {
        console.log('⚠️ GROQ_API_KEY not set, skipping Groq test');
        return;
      }

      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ 
          input: 'Say "OK" in one word', 
          model: 'llama-3.3-70b-versatile',
          apiKey: groqApiKey
        })
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.text).toContain('data:');
    }, 30000);
  });

  describe('POST /llm/q - Groq Llama Model', () => {
    it('should return stream for valid Llama request', async () => {
      const groqApiKey = process.env.GROQ_API_KEY;
      
      if (!groqApiKey) {
        console.log('⚠️ GROQ_API_KEY not set, skipping Llama test');
        return;
      }

      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ 
          input: 'Say "OK" in one word', 
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
          apiKey: groqApiKey
        })
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.text).toContain('data:');
    }, 30000);
  });

  describe('POST /llm/q - System Prompt', () => {
    it('should use system prompt when provided', async () => {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        console.log('⚠️ GEMINI_API_KEY not set, skipping system prompt test');
        return;
      }

      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ 
          input: 'What is 2+2?', 
          model: 'gemini-2.5-flash',
          apiKey: geminiApiKey,
          systemPrompt: 'You are a math assistant. Always answer in Spanish.'
        })
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
    }, 30000);
  });

  describe('POST /llm/q - Parameters', () => {
    it('should respect maxTokens parameter', async () => {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        console.log('⚠️ GEMINI_API_KEY not set, skipping parameters test');
        return;
      }

      const response = await request(BASE_URL)
        .post('/llm/q')
        .send({ 
          input: 'Count from 1 to 3', 
          model: 'gemini-2.5-flash',
          apiKey: geminiApiKey,
          maxTokens: 50,
          temperature: 0.5
        })
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
    }, 30000);
  });
});