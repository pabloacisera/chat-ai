import redisClient from '../config/redis.js';
import crypto from 'crypto';

const TTL = 24 * 60 * 60;

export function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

export async function createSession() {
  const sessionId = generateSessionId();
  
  await redisClient.hset(`anon:${sessionId}:meta`, {
    createdAt: new Date().toISOString(),
    welcomeShown: 'false'
  });
  
  await redisClient.expire(`anon:${sessionId}:meta`, TTL);
  await redisClient.expire(`anon:${sessionId}:config`, TTL);
  await redisClient.expire(`anon:${sessionId}:conversations`, TTL);
  
  return sessionId;
}

export async function getSessionMeta(sessionId) {
  const meta = await redisClient.hgetall(`anon:${sessionId}:meta`);
  return meta || null;
}

export async function getSessionConfig(sessionId) {
  const config = await redisClient.get(`anon:${sessionId}:config`);
  return config ? JSON.parse(config) : null;
}

export async function updateSessionConfig(sessionId, config) {
  await redisClient.set(`anon:${sessionId}:config`, JSON.stringify(config));
  await redisClient.expire(`anon:${sessionId}:config`, TTL);
}

export async function getConversations(sessionId) {
  const conversations = await redisClient.get(`anon:${sessionId}:conversations`);
  return conversations ? JSON.parse(conversations) : [];
}

export async function saveConversations(sessionId, conversations) {
  await redisClient.set(`anon:${sessionId}:conversations`, JSON.stringify(conversations));
  await redisClient.expire(`anon:${sessionId}:conversations`, TTL);
}

export async function getConversationMessages(sessionId, convId) {
  const messages = await redisClient.get(`anon:${sessionId}:conv:${convId}`);
  return messages ? JSON.parse(messages) : [];
}

export async function saveConversationMessages(sessionId, convId, messages) {
  await redisClient.set(`anon:${sessionId}:conv:${convId}`, JSON.stringify(messages));
  await redisClient.expire(`anon:${sessionId}:conv:${convId}`, TTL);
}

export async function deleteSession(sessionId) {
  const keys = await redisClient.keys(`anon:${sessionId}:*`);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}

export async function deleteConversationMessages(sessionId, convId) {
  await redisClient.del(`anon:${sessionId}:conv:${convId}`);
}

export async function setWelcomeShown(sessionId) {
  await redisClient.hset(`anon:${sessionId}:meta`, 'welcomeShown', 'true');
}