import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/db.js';
import * as authService from '../src/services/auth.service.js';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  createdAt: new Date(),
  isDeleted: false,
};

const mockConfig = {
  id: 'config-1',
  userId: 'user-1',
  theme: 'system',
  activeModelId: null,
  language: 'es',
  streamSpeed: 8,
  showTitle: true,
  autoDeleteDays: null,
  updatedAt: new Date(),
};

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-1', email: 'test@example.com' });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, config: mockConfig });

      const result = await authService.register('test@example.com', 'password123', 'Test User');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: mockUser.createdAt,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test User',
          }),
        }),
      );
    });

    it('should throw when email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.register('test@example.com', 'password123', 'Test User')).rejects.toThrow(
        'El email ya está registrado',
      );
    });

    it('should register without name', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, name: undefined, config: mockConfig });

      const result = await authService.register('test@example.com', 'password123', undefined);

      expect(result.name).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.session.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login('test@example.com', 'password123');

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('should throw for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('unknown@example.com', 'password123')).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw for deleted user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isDeleted: true });

      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw for wrong password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrong-password')).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('logout', () => {
    it('should delete session by token', async () => {
      (prisma.session.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await authService.logout('mock-jwt-token');

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'mock-jwt-token' } });
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      (prisma.session.findFirst as jest.Mock).mockResolvedValue({ id: 'session-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.verifyToken('valid-token');

      expect(result).toEqual({ userId: 'user-1', email: 'test@example.com' });
    });

    it('should throw for expired session', async () => {
      (prisma.session.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(authService.verifyToken('expired-token')).rejects.toThrow('Token inválido o expirado');
    });

    it('should throw for deleted user', async () => {
      (prisma.session.findFirst as jest.Mock).mockResolvedValue({ id: 'session-1' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, isDeleted: true });

      await expect(authService.verifyToken('valid-token')).rejects.toThrow('Usuario no encontrado');
    });

    it('should throw for invalid JWT', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(authService.verifyToken('bad-token')).rejects.toThrow('jwt malformed');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({ id: true, email: true }),
      });
    });
  });
});
