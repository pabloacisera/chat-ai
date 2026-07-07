import prisma from '../config/db.js';
import { encrypt, decrypt } from './encryption.service.js';

export async function getUserConfig(userId) {
  const config = await prisma.userConfig.findUnique({
    where: { userId }
  });

  if (!config) {
    return {
      theme: 'system',
      activeModelId: null,
      language: 'es',
      streamSpeed: 8,
      showTitle: true
    };
  }

  return config;
}

export async function updateUserConfig(userId, data) {
  const { theme, activeModelId, language, streamSpeed, showTitle } = data;

  return prisma.userConfig.upsert({
    where: { userId },
    create: {
      userId,
      theme: theme || 'system',
      activeModelId,
      language: language || 'es',
      streamSpeed,
      showTitle
    },
    update: {
      ...(theme && { theme }),
      ...(activeModelId !== undefined && { activeModelId }),
      ...(language && { language }),
      ...(streamSpeed !== undefined && { streamSpeed }),
      ...(showTitle !== undefined && { showTitle })
    }
  });
}

export async function getUserModels(userId) {
  return prisma.modelConfig.findMany({
    where: {
      userId,
      isActive: true
    },
    select: {
      id: true,
      modelId: true,
      provider: true,
      maxTokens: true,
      temperature: true,
      systemPrompt: true,
      isActive: true,
      createdAt: true
    }
  });
}

export async function addUserModel(userId, modelData) {
  const { modelId, provider, apiKey, maxTokens, temperature, systemPrompt } = modelData;

  if (!apiKey) {
    throw new Error('API Key es requerida');
  }

  const apiKeyEnc = encrypt(apiKey);

  return prisma.modelConfig.upsert({
    where: {
      userId_modelId: {
        userId,
        modelId
      }
    },
    create: {
      userId,
      modelId,
      provider,
      apiKeyEnc,
      maxTokens,
      temperature,
      systemPrompt,
      isActive: true
    },
    update: {
      provider,
      apiKeyEnc,
      maxTokens,
      temperature,
      systemPrompt,
      isActive: true
    }
  });
}

export async function updateUserModel(userId, modelId, data) {
  const { maxTokens, temperature, systemPrompt, apiKey } = data;

  const updateData = {};
  
  if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
  if (temperature !== undefined) updateData.temperature = temperature;
  if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
  if (apiKey) {
    updateData.apiKeyEnc = encrypt(apiKey);
  }

  return prisma.modelConfig.update({
    where: {
      userId_modelId: {
        userId,
        modelId
      }
    },
    data: updateData
  });
}

export async function deleteUserModel(userId, modelId) {
  return prisma.modelConfig.update({
    where: {
      userId_modelId: {
        userId,
        modelId
      }
    },
    data: { isActive: false }
  });
}

export async function getModelApiKey(userId, modelId) {
  const model = await prisma.modelConfig.findUnique({
    where: {
      userId_modelId: {
        userId,
        modelId
      }
    }
  });

  if (!model || !model.isActive) {
    return null;
  }

  return decrypt(model.apiKeyEnc);
}