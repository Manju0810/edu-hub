import dotenv from 'dotenv';
import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';

dotenv.config();

const jwt_secret = process.env.JWT_SECRET;
if (!jwt_secret) {
  throw new Error('JWT_SECRET is not available in env');
}

export const generateToken = (
  payload: string | object | Buffer<ArrayBufferLike>
) => {
  return jwt.sign(payload, jwt_secret, { expiresIn: '1h' });
};

export const saltRounds = 12;

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: true,
  maxAge: 24 * 60 * 60 * 1000,
};
