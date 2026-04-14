import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.EXPRESS_PORT || 3000;
const llmUrl = process.env.WEBHOOK_URL || '';

app.use(cors());
app.use(express.json());

app.post('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

const simpleMarkdownToHTML = (text: string): string => {
    if (!text || typeof text !== 'string') return text;
    
    let html = text;
    
    // Escapar caracteres HTML
    html = html.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
    
    // Negritas: **texto**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Cursivas: *texto*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Listas numeradas
    html = html.replace(/^(\d+)\.\s+(.*)$/gm, '<li>$2</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');
    
    // Listas con viñetas
    html = html.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Saltos de línea
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Envolver en párrafo si es necesario
    if (!html.startsWith('<p>') && !html.startsWith('<ul>') && !html.startsWith('<ol>')) {
        html = `<p>${html}</p>`;
    }
    
    return html;
};

// Cambia esto al principio del archivo para deshabilitar las verificaciones estrictas
// @ts-nocheck

// O si prefieres mantener TypeScript, usa esta versión con tipos any:
const processResponseRecursively = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        return simpleMarkdownToHTML(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map((item: any) => processResponseRecursively(item));
    }
    
    if (typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
            if (key === 'respuesta' || key === 'response' || key === 'text' || key === 'content') {
                newObj[key] = simpleMarkdownToHTML(obj[key]);
            } else {
                newObj[key] = processResponseRecursively(obj[key]);
            }
        }
        return newObj;
    }
    
    return obj;
};

app.post("/llm/q", async (req, res) => {
    const q = req.body.input;
    
    if (!q) {
        return res.status(400).json({ error: 'El campo "input" es requerido' });
    }
    
    if (!llmUrl) {
        return res.status(500).json({ error: 'WEBHOOK_URL no configurada' });
    }
    
    try {
        console.log(`Enviando a n8n: ${llmUrl}`);
        console.log(`Pregunta: ${q}`);
        
        const response = await fetch(llmUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                question: q,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`n8n responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Aplicar la conversión de Markdown a HTML
        const processedData = processResponseRecursively(data);
        
        res.json({ 
            response: processedData,
            originalQuestion: q,
            formatted: true
        });
        
    } catch (error) {
        console.error('Error llamando a n8n:', error);
        res.status(500).json({ 
            error: 'Error procesando la consulta',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WEBHOOK_URL configurada: ${llmUrl}`);
});