import * as authService from '../services/auth.service.js';
import { googleAuth } from '../services/google-auth.service.js';

export async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const user = await authService.register(email, password, name);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await authService.logout(token);
    }
    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const { token: googleToken } = req.body;
    
    if (!googleToken) {
      return res.status(400).json({ error: 'Token de Google requerido' });
    }

    const result = await googleAuth(googleToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
}