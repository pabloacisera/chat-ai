import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../src/app.js';

describe('Health Check', () => {
  it('GET /health should return ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
