import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_32_chars_minimum';

export async function register(email, password, name) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('El email ya está registrado');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      config: {
        create: {}
      }
    },
    include: {
      config: true
    }
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt
  };
}

export async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || user.isDeleted) {
    throw new Error('Credenciales inválidas');
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new Error('Credenciales inválidas');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt
    }
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt
    }
  };
}

export async function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }
      }
    });

    if (!session) {
      throw new Error('Token inválido o expirado');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, isDeleted: true }
    });

    if (!user || user.isDeleted) {
      throw new Error('Usuario no encontrado');
    }

    return { userId: payload.userId, email: payload.email };
  } catch (error) {
    throw new Error(error.message || 'Token inválido');
  }
}

export async function logout(token) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getUserById(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true
    }
  });
}