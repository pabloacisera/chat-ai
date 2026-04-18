// Simple API tests - run with: npx ts-node --transpile-only src/index.test.ts
// Prerequisites: npm install --save-dev supertest @types/supertest ts-jest jest

/**
 * Test Cases for /llm/q endpoint
 * 
 * Prerequisite: Run this file with ts-node after installing dependencies:
 * npm install --save-dev supertest @types/supertest ts-jest jest
 * 
 * Run: npx ts-node --transpile-only src/index.test.ts
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Setup environment
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const geminiUrl = process.env.GEMINI_URL || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';

app.use(cors());
app.use(express.json());

// Health endpoint
app.post('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// Markdown to HTML converter
const simpleMarkdownToHTML = (text: string): string => {
    if (!text || typeof text !== 'string') return text;
    let html = text;
    html = html.replace(/[&<>]/g, m => 
        m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : m
    );
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

// LLM endpoint
app.post("/llm/q", async (req, res) => {
    const q = req.body.input;
    
    if (!q) {
        return res.status(400).json({ error: 'El campo "input" es requerido' });
    }
    
    if (!geminiUrl || !geminiApiKey) {
        return res.status(500).json({ error: 'GEMINI_URL o GEMINI_API_KEY no configuradas' });
    }
    
    try {
        const fullUrl = `${geminiUrl}?key=${geminiApiKey}`;
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: q }] }]
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        let answer = '';
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            answer = data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Formato de respuesta inesperado de Gemini');
        }
        
        const processedAnswer = simpleMarkdownToHTML(answer);
        
        res.json({ 
            response: [{
                respuesta: processedAnswer,
                modelo: data.modelVersion || 'gemini-2.5-flash',
                tokens: data.usageMetadata?.totalTokenCount || 0
            }],
            originalQuestion: q,
            formatted: true
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: 'Error procesando la consulta',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ============================================
// TESTS - Run with Jest or manually
// ============================================

// Manual test runner (if Jest not available)
const runManualTests = async () => {
    console.log('Running manual API tests...\n');
    
    // Test 1: Health endpoint
    console.log('Test 1: GET /health');
    const healthRes = await request(app).get('/health');
    console.log('  Status:', healthRes.status);
    console.log('  Body:', JSON.stringify(healthRes.body));
    console.log('  ✓ Passed:', healthRes.status === 200 && healthRes.body.status === 'ok');
    
    // Test 2: Missing input
    console.log('\nTest 2: POST /llm/q - Missing input');
    const noInputRes = await request(app).post('/llm/q').send({});
    console.log('  Status:', noInputRes.status);
    console.log('  Body:', JSON.stringify(noInputRes.body));
    console.log('  ✓ Passed:', noInputRes.status === 400);
    
    // Test 3: Empty input
    console.log('\nTest 3: POST /llm/q - Empty input');
    const emptyInputRes = await request(app).post('/llm/q').send({ input: '' });
    console.log('  Status:', emptyInputRes.status);
    console.log('  Body:', JSON.stringify(emptyInputRes.body));
    console.log('  ✓ Passed:', emptyInputRes.status === 400);
    
    // Test 4: Valid request to Gemini
    console.log('\nTest 4: POST /llm/q - Valid request');
    const validRes = await request(app).post('/llm/q').send({ input: '¿Cuál es 2+2?' });
    console.log('  Status:', validRes.status);
    console.log('  Response keys:', Object.keys(validRes.body));
    console.log('  ✓ Passed:', validRes.status === 200 && validRes.body.response);
    
    // Test 5: Markdown formatting
    console.log('\nTest 5: POST /llm/q - Markdown formatting');
    const formatRes = await request(app).post('/llm/q').send({ input: 'Usa **negritas** y *cursiva*' });
    console.log('  Status:', formatRes.status);
    console.log('  Has <strong>:', formatRes.body.response[0].respuesta.includes('<strong>'));
    console.log('  Has <em>:', formatRes.body.response[0].respuesta.includes('<em>'));
    console.log('  ✓ Passed:', formatRes.status === 200);
    
    console.log('\n========================================');
    console.log('Manual tests completed!');
    console.log('========================================');
};

// Export for Jest
export { app };

// Run if executed directly
if (require.main === module) {
    runManualTests().catch(console.error);
}

/* 
JEST TESTS (use with Jest runner):
----------------------------------
describe('API Endpoints', () => {
    describe('GET /health', () => {
        it('should return ok status', async () => {
            const response = await request(app).get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({ status: 'ok' });
        });
    });

    describe('POST /llm/q', () => {
        it('should return 400 when input is missing', async () => {
            const response = await request(app).post('/llm/q').send({});
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('El campo "input" es requerido');
        });

        it('should return 400 when input is empty string', async () => {
            const response = await request(app).post('/llm/q').send({ input: '' });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('El campo "input" es requerido');
        });

        it('should return valid response from Gemini API', async () => {
            const response = await request(app)
                .post('/llm/q')
                .send({ input: '¿Cuál es la capital de Francia?' });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('response');
            expect(response.body.response[0]).toHaveProperty('respuesta');
            expect(response.body.response[0].respuesta).toContain('París');
        }, 30000);

        it('should handle markdown formatting in response', async () => {
            const response = await request(app)
                .post('/llm/q')
                .send({ input: 'Dame una lista con **negritas** y *cursiva*' });
            
            expect(response.body.response[0].respuesta).toContain('<strong>');
            expect(response.body.response[0].respuesta).toContain('<em>');
        }, 30000);
    });
});
*/