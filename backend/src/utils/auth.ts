import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { CookieOptions } from 'express';

dotenv.config();

const jwt_secret = process.env.JWT_SECRET!;

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
