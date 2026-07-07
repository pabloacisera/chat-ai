import prisma from '../config/db.js';
import { encrypt, decrypt } from './encryption.service.js';

const DEFAULT_CONFIG = {
  theme: 'system',
  activeModelId: null,
  language: 'es',
  streamSpeed: 8,
  showTitle: true,
  autoDeleteDays: null,
};

export async function getUserConfig(userId: string) {
  const config = await prisma.userConfig.findUnique({
    where: { userId },
  });

  if (!config) {
    return { ...DEFAULT_CONFIG };
  }

  return config;
}

export async function updateUserConfig(userId: string, data: Record<string, unknown>) {
  const { theme, activeModelId, language, streamSpeed, showTitle, autoDeleteDays } = data;

  return prisma.userConfig.upsert({
    where: { userId },
    create: {
      userId,
      theme: theme || DEFAULT_CONFIG.theme,
      activeModelId,
      language: language || DEFAULT_CONFIG.language,
      streamSpeed,
      showTitle,
      autoDeleteDays,
    },
    update: {
      ...(theme && { theme }),
      ...(activeModelId !== undefined && { activeModelId }),
      ...(language && { language }),
      ...(streamSpeed !== undefined && { streamSpeed }),
      ...(showTitle !== undefined && { showTitle }),
      ...(autoDeleteDays !== undefined && { autoDeleteDays }),
    },
  });
}

export async function getUserModels(userId: string) {
  return prisma.modelConfig.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      modelId: true,
      provider: true,
      maxTokens: true,
      temperature: true,
      systemPrompt: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export async function addUserModel(userId: string, modelData: Record<string, unknown>) {
  const { modelId, provider, apiKey, maxTokens, temperature, systemPrompt } = modelData;

  if (!apiKey) {
    throw new Error('API Key es requerida');
  }

  const apiKeyEnc = encrypt(apiKey) ?? '';

  return prisma.modelConfig.upsert({
    where: {
      userId_modelId: {
        userId,
        modelId,
      },
    },
    create: {
      userId,
      modelId,
      provider,
      apiKeyEnc,
      maxTokens,
      temperature,
      systemPrompt,
      isActive: true,
    },
    update: {
      provider,
      apiKeyEnc,
      maxTokens,
      temperature,
      systemPrompt,
      isActive: true,
    },
  });
}

interface UpdateModelData {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  apiKey?: string;
}

export async function updateUserModel(userId: string, modelId: string, data: UpdateModelData) {
  const { maxTokens, temperature, systemPrompt, apiKey } = data;

  const updateData: Record<string, unknown> = {};

  if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
  if (temperature !== undefined) updateData.temperature = temperature;
  if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
  if (apiKey) {
    updateData.apiKeyEnc = encrypt(apiKey) ?? '';
  }

  return prisma.modelConfig.update({
    where: {
      userId_modelId: {
        userId,
        modelId,
      },
    },
    data: updateData,
  });
}

export async function deleteUserModel(userId: string, modelId: string) {
  return prisma.modelConfig.update({
    where: {
      userId_modelId: {
        userId,
        modelId,
      },
    },
    data: { isActive: false },
  });
}

export async function getModelApiKey(userId: string, modelId: string) {
  const model = await prisma.modelConfig.findUnique({
    where: {
      userId_modelId: {
        userId,
        modelId,
      },
    },
  });

  if (!model || !model.isActive) {
    return null;
  }

  return decrypt(model.apiKeyEnc);
}
