import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_32_chars_minimum';

async function getGoogleUserInfo(accessToken) {
  const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Error obtaining Google user info');
  return response.json();
}

export async function googleAuth(googleToken) {
  const googleUser = await getGoogleUserInfo(googleToken);
  
  const { id: googleId, email, picture: avatar } = googleUser;

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId },
        { email }
      ]
    }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        avatar,
        passwordHash: 'GOOGLE_AUTH',
        config: { create: {} }
      },
      include: { config: true }
    });
  }

  if (user.isDeleted) {
    throw new Error('Usuario eliminado');
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
      avatar: user.avatar,
      createdAt: user.createdAt
    }
  };
}