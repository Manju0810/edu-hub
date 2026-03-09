import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const jwt_secret = process.env.JWT_SECRET!;

export interface AuthPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
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
