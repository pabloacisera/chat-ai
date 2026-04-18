import * as usersService from '../services/users.service.js';

export async function getMe(req, res, next) {
  try {
    const user = await usersService.getUserConfig(req.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function getConfig(req, res, next) {
  try {
    const config = await usersService.getUserConfig(req.userId);
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(req, res, next) {
  try {
    const config = await usersService.updateUserConfig(req.userId, req.body);
    res.json(config);
  } catch (error) {
    next(error);
  }
}