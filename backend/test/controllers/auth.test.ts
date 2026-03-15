import { beforeEach, describe, jest, test, expect } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import type { DeepMockProxy } from 'jest-mock-extended';
import { mockDeep, mockReset } from 'jest-mock-extended';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { app } from '../../src/app';
import { prisma } from '../../src/prisma';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
    sign: jest.fn(),
  },
}));

jest.mock('../../src/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

const mockJwt = jest.mocked(jwt);
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

const validateCookie = (
  cookie: string,
  cookieName: string,
  mockCookieValue: string
) => {
  expect(cookie).toBeDefined();
  const parts = cookie.split('; ').reduce(
    (acc, part) => {
      const [key, value] = part.split('=');
      acc[key as string] = value ?? true;
      return acc;
    },
    {} as Record<string, string | boolean>
  );
  expect(parts[cookieName]).toBe(mockCookieValue);
  expect(parts['Max-Age']).toBe('86400');
  expect(parts.HttpOnly).toBe(true);
  expect(parts.Secure).toBe(true);
  expect(parts.SameSite).toBe('Lax');
  expect(parts.Path).toBe('/');
};

describe('Register Endpoint Tests', () => {
  const mockValidRegisterPayload = {
    username: 'user',
    mobileNumber: '1234567890',
    email: 'test@example.com',
    password: 'Password123',
    profileImage: 'mock-profile-image-data',
    role: 'student' as Role,
  };

  test('should register user with valid data', async () => {
    const mockPrismaCreateResponse = {
      userId: 'mock-userid',
      username: mockValidRegisterPayload.username,
      email: mockValidRegisterPayload.email,
      role: mockValidRegisterPayload.role,
      mobileNumber: mockValidRegisterPayload.mobileNumber,
      profileImage: mockValidRegisterPayload.profileImage,
      createdAt: new Date(),
    };

    prismaMock.user.create.mockResolvedValue(mockPrismaCreateResponse as any);
    mockJwt.sign.mockReturnValue('fake-token' as never);

    const response = await request(app)
      .post('/api/auth/register')
      .send(mockValidRegisterPayload);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: mockValidRegisterPayload.email,
      },
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        username: mockValidRegisterPayload.username,
        email: mockValidRegisterPayload.email,
        role: mockValidRegisterPayload.role,
        mobileNumber: mockValidRegisterPayload.mobileNumber,
        profileImage: mockValidRegisterPayload.profileImage,
        password: expect.any(String),
      },
      select: {
        userId: true,
        username: true,
        email: true,
        role: true,
        mobileNumber: true,
        profileImage: true,
        createdAt: true,
      },
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      ...mockPrismaCreateResponse,
      createdAt: mockPrismaCreateResponse.createdAt.toISOString(),
    });
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    validateCookie(cookie, 'token', 'fake-token');
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.user.create.mockRejectedValue('Prisma Error');
    mockJwt.sign.mockReturnValue('fake-token' as never);

    const response = await request(app)
      .post('/api/auth/register')
      .send(mockValidRegisterPayload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Error in registering user: Prisma Error',
        },
      ],
    });
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('should return error when user already exists', async () => {
    const mockPrismaResponse = {
      userId: 'mock-userid',
      username: mockValidRegisterPayload.username,
      email: mockValidRegisterPayload.email,
      role: mockValidRegisterPayload.role,
      mobileNumber: mockValidRegisterPayload.mobileNumber,
      profileImage: mockValidRegisterPayload.profileImage,
      createdAt: new Date(),
    };
    prismaMock.user.findUnique.mockResolvedValue(mockPrismaResponse as any);

    const response = await request(app)
      .post('/api/auth/register')
      .send(mockValidRegisterPayload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'email',
          message: 'Email already exists',
        },
      ],
    });
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('should return validation error when payload is missing', async () => {
    const response = await request(app).post('/api/auth/register').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'username',
          message: 'Username is required',
        },
        {
          field: 'mobileNumber',
          message: 'Mobile number is required',
        },
        { field: 'profileImage', message: 'Profile image URL is required' },
        {
          field: 'email',
          message: 'Invalid email address',
        },
        {
          field: 'password',
          message: 'Password is required',
        },
        {
          field: 'role',
          message: "Role must be either 'student' or 'educator'",
        },
      ],
    });
  });

  test('should return validation error for invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...mockValidRegisterPayload,
        email: 'invalid-email',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'email',
          message: 'Invalid email address',
        },
      ],
    });
  });

  test('should return validation error for short password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...mockValidRegisterPayload,
        password: '123',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'password',
          message: 'Password must be at least 8 characters',
        },
      ],
    });
  });

  test('should return validation error for long password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...mockValidRegisterPayload,
        password:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'password',
          message: 'Password must be at most 100 characters',
        },
      ],
    });
  });

  test('should return validation error when role is not student or educator', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...mockValidRegisterPayload,
        role: 'manager',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'role',
          message: "Role must be either 'student' or 'educator'",
        },
      ],
    });
  });
});

describe('Login Endpoint Tests', () => {
  const mockValidLoginPayload = {
    username: 'user',
    password: 'Password123',
  };
  test('Should login user with valid data', async () => {
    const mockPrismaLoginResponse = {
      userId: 'mock-userid',
      username: mockValidLoginPayload.username,
      email: 'test@example.com',
      role: 'student' as Role,
      mobileNumber: '1234567890',
      profileImage: 'mock-profile-image-data',
      createdAt: new Date(),
      password: bcrypt.hashSync(mockValidLoginPayload.password, 12),
    };
    prismaMock.user.findUnique.mockResolvedValue(mockPrismaLoginResponse);
    mockJwt.sign.mockReturnValue('fake-token' as never);

    const response = await request(app)
      .post('/api/auth/login')
      .send(mockValidLoginPayload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...mockPrismaLoginResponse,
      createdAt: mockPrismaLoginResponse.createdAt.toISOString(),
    });
    const cookie = response.headers['set-cookie']?.[0] || '';
    validateCookie(cookie, 'token', 'fake-token');
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.user.findUnique.mockRejectedValue('Prisma Error');
    mockJwt.sign.mockReturnValue('fake-token' as never);

    const response = await request(app)
      .post('/api/auth/login')
      .send(mockValidLoginPayload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Error in user login: Prisma Error',
        },
      ],
    });
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('should return error when user does not exists', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send(mockValidLoginPayload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'username',
          message: 'No user found',
        },
      ],
    });
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('Should throw error when password mismatch', async () => {
    const mockPrismaLoginResponse = {
      userId: 'mock-userid',
      username: mockValidLoginPayload.username,
      email: 'test@example.com',
      role: 'student' as Role,
      mobileNumber: '1234567890',
      profileImage: 'mock-profile-image-data',
      createdAt: new Date(),
      password: 'mock-password',
    };
    prismaMock.user.findUnique.mockResolvedValue(
      mockPrismaLoginResponse as any
    );
    const response = await request(app)
      .post('/api/auth/login')
      .send(mockValidLoginPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'password',
          message: 'Invalid password',
        },
      ],
    });
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('should return validation error when payload is missing', async () => {
    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'username',
          message: 'Username is required',
        },
        {
          field: 'password',
          message: 'Password is required',
        },
      ],
    });
  });
});

describe('Get All Students Endpoint Tests', () => {
  test('should fetch all students', async () => {
    const mockPrismaCreateResponse = [
      {
        userId: 'mock-userid1',
        username: 'user1',
        email: 'test@example.com',
        role: 'student' as Role,
        mobileNumber: '1234567890',
        profileImage: 'mock-profile-image-data',
        createdAt: new Date(),
        password: 'mock-password',
      },
      {
        userId: 'mock-userid2',
        username: 'user2',
        email: 'test2@example.com',
        role: 'student' as Role,
        mobileNumber: '1234567890',
        profileImage: 'mock-profile-image-data',
        createdAt: new Date(),
        password: 'mock-password',
      },
    ];

    prismaMock.user.findMany.mockResolvedValue(mockPrismaCreateResponse);

    mockJwt.verify.mockReturnValue({
      userId: 'mock-user',
      email: 'test@test.com',
      role: Role.educator,
    } as never);

    const response = await request(app)
      .get('/api/auth/user/getAllStudents')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      students: mockPrismaCreateResponse.map((student) => ({
        ...student,
        createdAt: student.createdAt.toISOString(),
      })),
      count: mockPrismaCreateResponse.length,
    });
  });

  test('should throw error when requested user role is student', async () => {
    mockJwt.verify.mockReturnValue({
      userId: 'mock-user',
      email: 'test@test.com',
      role: Role.student,
    } as never);

    const response = await request(app)
      .get('/api/auth/user/getAllStudents')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'role',
          message: 'Access is denied',
        },
      ],
    });
  });

  test('should throw error when no token is provided', async () => {
    const response = await request(app).get('/api/auth/user/getAllStudents');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'token',
          message: 'No token - Unauthorized',
        },
      ],
    });
  });

  test('should throw error when jwt throws error', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Jwt Error');
    });

    const response = await request(app)
      .get('/api/auth/user/getAllStudents')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'token',
          message: 'Invalid token - Unauthorized: Jwt Error',
        },
      ],
    });
  });

  test('should search students by username or email', async () => {
    const mockPrismaCreateResponse = [
      {
        userId: 'mock-userid1',
        username: 'user1',
        email: 't@example.com',
        mobileNumber: '1234567890',
      },
      {
        userId: 'mock-userid2',
        username: 'user2',
        email: 'test2@example.com',
        mobileNumber: '1234567890',
      },
    ];

    prismaMock.user.findMany.mockResolvedValue(mockPrismaCreateResponse as any);

    mockJwt.verify.mockReturnValue({
      userId: 'mock-user',
      email: 'test@test.com',
      role: Role.educator,
    } as never);

    const response = await request(app)
      .get(
        '/api/auth/user/getAllStudents?search=test&sortBy=username&order=asc'
      )
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      students: mockPrismaCreateResponse,
      count: mockPrismaCreateResponse.length,
    });
  });

  test('should sort students by username or email', async () => {
    const mockPrismaCreateResponse = [
      {
        userId: 'mock-userid1',
        username: 'user1',
        email: 'test@example.com',
        mobileNumber: '1234567890',
      },
      {
        userId: 'mock-userid2',
        username: 'user2',
        email: 'test2@example.com',
        mobileNumber: '1234567890',
      },
    ];

    prismaMock.user.findMany.mockResolvedValue(mockPrismaCreateResponse as any);

    mockJwt.verify.mockReturnValue({
      userId: 'mock-user',
      email: 'test@test.com',
      role: Role.educator,
    } as never);

    const response = await request(app)
      .get('/api/auth/user/getAllStudents?sortBy=email&order=desc')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      students: mockPrismaCreateResponse,
      count: mockPrismaCreateResponse.length,
    });
  });
});
