import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service.js';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getUserConfig(req.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function getConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await usersService.getUserConfig(req.userId);
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await usersService.updateUserConfig(req.userId, req.body);
    res.json(config);
  } catch (error) {
    next(error);
  }
}
