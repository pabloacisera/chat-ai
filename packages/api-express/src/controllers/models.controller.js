import * as usersService from '../services/users.service.js';

export async function getModels(req, res, next) {
  try {
    const models = await usersService.getUserModels(req.userId);
    res.json(models);
  } catch (error) {
    next(error);
  }
}

export async function addModel(req, res, next) {
  try {
    const { modelId, provider, apiKey, maxTokens, temperature, systemPrompt } = req.body;
    
    if (!modelId || !provider || !apiKey) {
      return res.status(400).json({ error: 'modelId, provider y apiKey son requeridos' });
    }

    const model = await usersService.addUserModel(req.userId, {
      modelId,
      provider,
      apiKey,
      maxTokens,
      temperature,
      systemPrompt
    });

    res.status(201).json({
      id: model.id,
      modelId: model.modelId,
      provider: model.provider,
      isActive: model.isActive
    });
  } catch (error) {
    next(error);
  }
}

export async function updateModel(req, res, next) {
  try {
    const { modelId } = req.params;
    const model = await usersService.updateUserModel(req.userId, modelId, req.body);
    res.json(model);
  } catch (error) {
    next(error);
  }
}

export async function deleteModel(req, res, next) {
  try {
    const { modelId } = req.params;
    await usersService.deleteUserModel(req.userId, modelId);
    res.json({ message: 'Modelo eliminado' });
  } catch (error) {
    next(error);
  }
}