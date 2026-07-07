import * as anonService from '../services/anon.service.js';

export async function createSession(req, res, next) {
  try {
    const sessionId = await anonService.createSession();
    res.json({ sessionId });
  } catch (error) {
    next(error);
  }
}

export async function getConversations(req, res, next) {
  try {
    const { sessionId } = req.params;
    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }
    const conversations = await anonService.getConversations(sessionId);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
}

export async function createConversation(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { title, modelId, provider } = req.body;

    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }

    const conversations = await anonService.getConversations(sessionId);
    
    const newConversation = {
      id: `anon_${Date.now()}`,
      title: title || 'Nueva conversación',
      modelId,
      provider,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    conversations.unshift(newConversation);
    await anonService.saveConversations(sessionId, conversations);
    await anonService.saveConversationMessages(sessionId, newConversation.id, []);

    res.status(201).json(newConversation);
  } catch (error) {
    next(error);
  }
}

export async function syncConversations(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { conversations, messages } = req.body;

    if (conversations && Array.isArray(conversations)) {
      await anonService.saveConversations(sessionId, conversations);
    }

    if (messages && typeof messages === 'object') {
      for (const [convId, msgs] of Object.entries(messages)) {
        await anonService.saveConversationMessages(sessionId, convId, msgs);
      }
    }

    res.json({ message: 'Sincronizado correctamente' });
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { sessionId, convId } = req.params;
    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }
    const messages = await anonService.getConversationMessages(sessionId, convId);
    res.json(messages);
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const { sessionId, convId } = req.body;
    const { content, modelId, provider, apiKey, maxTokens, temperature, systemPrompt, assistantMessage: providedAssistantMessage } = req.body;

    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }

    if (!content) {
      return res.status(400).json({ error: 'content es requerido' });
    }

    const messages = await anonService.getConversationMessages(sessionId, convId);
    
    const userMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };
    messages.push(userMessage);

    let fullResponse = providedAssistantMessage;

    const UMBRAL = 10;
    let history = [];

    if (messages.length <= UMBRAL) {
      history = messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
    } else {
      history = messages.slice(-7, -1).map(m => ({ role: m.role, content: m.content }));
    }

    if (!fullResponse) {
      const { callAI } = await import('../services/ai.service.js');
      fullResponse = await callAI(content, modelId, apiKey, {
        maxTokens: maxTokens || 4096,
        temperature: temperature ?? 0.7,
        systemPrompt
      }, history);
    }

    const assistantMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: fullResponse,
      createdAt: new Date().toISOString()
    };
    messages.push(assistantMessage);

    await anonService.saveConversationMessages(sessionId, convId, messages);

    res.json({ userMessage, assistantMessage });
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(req, res, next) {
  try {
    const { sessionId } = req.params;
    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }
    await anonService.updateSessionConfig(sessionId, req.body);
    res.json({ message: 'Configuración actualizada' });
  } catch (error) {
    next(error);
  }
}

export async function getWelcomeShown(req, res, next) {
  try {
    const { sessionId } = req.params;
    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }
    const meta = await anonService.getSessionMeta(sessionId);
    res.json({ welcomeShown: meta?.welcomeShown === 'true' });
  } catch (error) {
    next(error);
  }
}

export async function setWelcomeShown(req, res, next) {
  try {
    const { sessionId } = req.params;
    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }
    await anonService.setWelcomeShown(sessionId);
    res.json({ message: 'Welcome shown actualizado' });
  } catch (error) {
    next(error);
  }
}

export async function updateConversation(req, res, next) {
  try {
    const { sessionId, convId } = req.params;
    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }
    const { title } = req.body;
    const conversations = await anonService.getConversations(sessionId);
    const updated = conversations.map(c =>
      String(c.id) === String(convId) ? { ...c, title: title ?? c.title, updatedAt: new Date().toISOString() } : c
    );
    await anonService.saveConversations(sessionId, updated);
    res.json(updated.find(c => String(c.id) === String(convId)) || { message: 'Actualizado' });
  } catch (error) {
    next(error);
  }
}

export async function deleteConversation(req, res, next) {
  try {
    const { sessionId, convId } = req.params;
    if (!sessionId || sessionId === 'null') {
      return res.status(400).json({ error: 'Session ID inválido' });
    }
    const conversations = await anonService.getConversations(sessionId);
    const filtered = conversations.filter(c => String(c.id) !== String(convId));
    await anonService.saveConversations(sessionId, filtered);
    await anonService.deleteConversationMessages(sessionId, convId);
    res.json({ message: 'Conversación eliminada' });
  } catch (error) {
    next(error);
  }
}