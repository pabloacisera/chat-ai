import * as messagesService from '../services/messages.service.js';
import * as aiService from '../services/ai.service.js';
import * as memoryService from '../services/memory.service.js';

export async function sendMessage(req, res, next) {
  try {
    const { conversationId, content, modelId, maxTokens, temperature, systemPrompt, assistantMessage: providedAssistantMessage } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ error: 'conversationId y content son requeridos' });
    }

    const { userMessage, conversation, apiKey, defaults } = await messagesService.createMessage(
      req.userId,
      conversationId,
      content,
      modelId
    );

    let fullResponse = providedAssistantMessage;

    if (!fullResponse) {
      const history = await memoryService.buildContext(conversationId);
      fullResponse = await aiService.callAI(content, conversation.modelId, apiKey, {
        maxTokens: maxTokens || defaults.maxTokens,
        temperature: temperature ?? defaults.temperature,
        systemPrompt
      }, history);
    }

    const assistantMessage = await messagesService.saveAssistantMessage(conversationId, fullResponse);
    await messagesService.updateConversationTimestamp(conversationId);

    res.json({
      userMessage,
      assistantMessage,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        modelId: conversation.modelId
      }
    });

    setImmediate(() => {
      memoryService.updateSummaryIfNeeded(
        conversationId,
        conversation.modelId,
        apiKey
      ).catch(err => console.error('Error actualizando summary:', err));
    });
  } catch (error) {
    next(error);
  }
}