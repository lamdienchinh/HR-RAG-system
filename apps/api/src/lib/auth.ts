import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

import { config } from '../config.js';
import { pool } from '../db/pool.js';

// --- Types ---

export interface AuthUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: 'admin' | 'employee';
}

interface UserRow {
  readonly id: string;
  readonly username: string;
  readonly password_hash: string;
  readonly display_name: string;
  readonly role: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// --- Password ---

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = async (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

// --- JWT ---

const TOKEN_EXPIRY = '24h';

export const generateToken = (user: AuthUser): string =>
  jwt.sign(
    { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    config.jwtSecret,
    { expiresIn: TOKEN_EXPIRY },
  );

export const verifyToken = (token: string): AuthUser | null => {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    return { id: payload.id, username: payload.username, displayName: payload.displayName, role: payload.role };
  } catch {
    return null;
  }
};

// --- DB operations ---

export const findUserByUsername = async (username: string): Promise<(AuthUser & { passwordHash: string }) | null> => {
  const result = await pool.query<UserRow>(
    'SELECT id, username, password_hash, display_name, role FROM users WHERE username = $1',
    [username],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role as 'admin' | 'employee',
    passwordHash: row.password_hash,
  };
};

export const findUserById = async (id: string): Promise<AuthUser | null> => {
  const result = await pool.query<UserRow>(
    'SELECT id, username, password_hash, display_name, role FROM users WHERE id = $1',
    [id],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role as 'admin' | 'employee',
  };
};

// --- Seed default users ---

export const seedUsers = async (): Promise<void> => {
  const users = [
    { username: 'admin', password: 'admin123', displayName: 'Quản trị viên', role: 'admin' as const },
    { username: 'employee', password: 'employee123', displayName: 'Nhân viên', role: 'employee' as const },
  ];
  for (const user of users) {
    const existing = await findUserByUsername(user.username);
    if (existing) continue;
    const hash = await hashPassword(user.password);
    await pool.query(
      'INSERT INTO users (id, username, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5)',
      [`user-${user.username}`, user.username, hash, user.displayName, user.role],
    );
  }
};

// --- Express middleware ---

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {  // eslint-disable-line @typescript-eslint/no-explicit-any
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.user = user;
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
