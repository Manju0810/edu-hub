import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Auth utilities', () => {
  const originalEnv = process.env.JWT_SECRET;

  beforeEach(() => {
    // clear modules to re-evaluate dotenv/config block
    jest.resetModules();
    process.env.JWT_SECRET = originalEnv;
  });

  test('throws when JWT_SECRET is missing', () => {
    // make sure variable is falsy (empty string or undefined)
    process.env.JWT_SECRET = '';
    // isolateModules ensures the module is evaluated fresh avoiding cache
    jest.isolateModules(() => {
      expect(() => require('../../src/utils/auth')).toThrow(
        'JWT_SECRET is not available in env'
      );
    });
  });

  test('generateToken calls jwt.sign correctly', () => {
    process.env.JWT_SECRET = 'supersecret';
    const jwt = require('jsonwebtoken');
    jwt.sign = jest.fn().mockReturnValue('signed-token');
    const { generateToken } = require('../../src/utils/auth');

    const payload = { foo: 'bar' };
    const token = generateToken(payload);

    expect(jwt.sign).toHaveBeenCalledWith(payload, 'supersecret', {
      expiresIn: '1h',
    });
    expect(token).toBe('signed-token');
  });

  test('cookieOptions has correct properties', () => {
    const { cookieOptions } = require('../../src/utils/auth');
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.secure).toBe(true);
    expect(cookieOptions.maxAge).toBe(24 * 60 * 60 * 1000);
    expect(cookieOptions.sameSite).toBe('lax');
  });
});
