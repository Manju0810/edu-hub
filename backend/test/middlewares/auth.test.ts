import { describe, expect, jest, test } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { CustomRequest, verifyToken } from '../../src/middlewares/auth';
import { Response } from 'express';
import { Role } from '@prisma/client';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
  },
}));

const mockJwt = jest.mocked(jwt);

describe('token verification tests', () => {
  test('should throw error when no token is provided', () => {
    const req: Partial<CustomRequest> = {
      cookies: {},
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    verifyToken(req as CustomRequest, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: [
        {
          field: 'token',
          message: 'No token - Unauthorized',
        },
      ],
    });

    expect(next).not.toHaveBeenCalled();
    expect(mockJwt.verify).not.toHaveBeenCalled();
  });

  test('should throw error when jwt throws error', () => {
    const req: Partial<CustomRequest> = {
      cookies: {
        token: 'mock=token',
      },
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    mockJwt.verify.mockImplementation(() => {
      throw new Error('JWT Error');
    });

    verifyToken(req as CustomRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errors: [
        {
          field: 'token',
          message: `Invalid token - Unauthorized: JWT Error`,
        },
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should verify the token provided and call next function', () => {
    const req: Partial<CustomRequest> = {
      cookies: {
        token: 'mock=token',
      },
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    mockJwt.verify.mockImplementation(() => {
      return {
        username: 'test-user',
        email: 'test-user@example.com',
        role: 'student' as Role,
      } as never;
    });

    verifyToken(req as CustomRequest, res as Response, next);
    expect(next).toHaveBeenCalled();
  });
});
