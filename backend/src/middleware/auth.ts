import dotenv from 'dotenv';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types/types';

dotenv.config();

const jwt_secret = process.env.JWT_SECRET;
if (!jwt_secret) {
  throw new Error('JWT_SECRET is not available in env');
}

export interface CustomRequest extends Request {
  user?: AuthPayload;
}

export const verifyToken = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: 'No token - Unauthorized' });
    }

    const payload = jwt.verify(token, jwt_secret) as AuthPayload;
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: `Invalid token - Unauthorized: ${error}`,
    });
  }
};
