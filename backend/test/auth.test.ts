import request from 'supertest';
import { PrismaClient, Role } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { beforeEach, jest } from '@jest/globals';
import { describe, test, expect } from '@jest/globals';
import { app } from '../src/app';
import { prisma } from '../src/prisma';
import { generateToken } from '../src/utils/auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../src/utils/auth');

const mockGenerateToken = jest.mocked(generateToken);

jest.mock('../src/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(
      (): AuthPayload => ({
        userId: 'mock-user',
        email: 'test@test.com',
        role: Role.educator,
      })
    ),
  },
}));

const mockJwt = jest.mocked(jwt);

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

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

describe('Register Endpoint Tests', () => {
  const mockValidReqisterPayload = {
    username: 'testuser',
    mobileNumber: '1234567890',
    email: 'test@example.com',
    password: 'Password123',
    profileImage: 'mock-profile-image-data',
    role: 'student' as Role,
  };
  test('should register user with valid data', async () => {
    const mockPrismaCreateReponse = {
      userId: 'mock-userid',
      username: mockValidReqisterPayload.username,
      email: mockValidReqisterPayload.email,
      role: mockValidReqisterPayload.role,
      mobileNumber: mockValidReqisterPayload.mobileNumber,
      profileImage: mockValidReqisterPayload.profileImage,
      password: '',
      createdAt: new Date(),
    };

    prismaMock.user.create.mockResolvedValue(mockPrismaCreateReponse);
    mockGenerateToken.mockReturnValue('fake-token');

    const response = await request(app)
      .post('/api/auth/register')
      .send(mockValidReqisterPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User registered successfully');
    expect(response.body.user).toEqual({
      ...mockPrismaCreateReponse,
      createdAt: mockPrismaCreateReponse.createdAt.toISOString(),
    });
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    validateCookie(cookie, 'token', 'fake-token');
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.user.create.mockRejectedValue('Prisma Error');
    mockGenerateToken.mockReturnValue('fake-token');

    const response = await request(app)
      .post('/api/auth/register')
      .send(mockValidReqisterPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Error in registering user: Prisma Error'
    );
    expect(response.body.user).not.toBeDefined();
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('should return error when user already exists', async () => {
    const mockPrismaResponse = {
      userId: 'mock-userid',
      username: mockValidReqisterPayload.username,
      email: mockValidReqisterPayload.email,
      role: mockValidReqisterPayload.role,
      mobileNumber: mockValidReqisterPayload.mobileNumber,
      profileImage: mockValidReqisterPayload.profileImage,
      password: '',
      createdAt: new Date(),
    };
    prismaMock.user.findUnique.mockResolvedValue(mockPrismaResponse);

    const response = await request(app)
      .post('/api/auth/register')
      .send(mockValidReqisterPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Email already exists');
    expect(response.body.user).not.toBeDefined();
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('should return validation error when payload is missing', async () => {
    const response = await request(app).post('/api/auth/register').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation Error');
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toEqual([
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
      { field: 'role', message: "Role must be either 'student' or 'educator'" },
    ]);
  });

  test('should return validation error for invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...mockValidReqisterPayload,
        email: 'invalid-email',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation Error');
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: 'email',
      message: 'Invalid email address',
    });
  });

  test('should return validation error for short password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...mockValidReqisterPayload,
        password: '123',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation Error');
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: 'password',
      message: 'Password must be at least 8 characters',
    });
  });

  test('should return validation error for long password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...mockValidReqisterPayload,
        password:
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation Error');
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: 'password',
      message: 'Password must be at most 100 characters',
    });
  });

  test('should return validation error when role is not student or educator', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...mockValidReqisterPayload,
        role: 'manager',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation Error');
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toContainEqual({
      field: 'role',
      message: "Role must be either 'student' or 'educator'",
    });
  });
});

describe('Login Endpoint Tests', () => {
  const mockValidLoginPayload = {
    username: 'testuser',
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
    mockGenerateToken.mockReturnValue('fake-token');
    const response = await request(app)
      .post('/api/auth/login')
      .send(mockValidLoginPayload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User logged in successfully');
    expect(response.body.user).toEqual({
      ...mockPrismaLoginResponse,
      createdAt: mockPrismaLoginResponse.createdAt.toISOString(),
    });
    const cookie = response.headers['set-cookie']?.[0] || '';
    validateCookie(cookie, 'token', 'fake-token');
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.user.findUnique.mockRejectedValue('Prisma Error');
    mockGenerateToken.mockReturnValue('fake-token');

    const response = await request(app)
      .post('/api/auth/login')
      .send(mockValidLoginPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Error in user login: Prisma Error');
    expect(response.body.user).not.toBeDefined();
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('should return error when user does not exists', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send(mockValidLoginPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No user found');
    expect(response.body.user).not.toBeDefined();
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
    prismaMock.user.findUnique.mockResolvedValue(mockPrismaLoginResponse);
    const response = await request(app)
      .post('/api/auth/login')
      .send(mockValidLoginPayload);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('password invalid');
    expect(response.body.user).not.toBeDefined();
    const cookies = response.headers['set-cookie'];
    expect(cookies).not.toBeDefined();
  });

  test('should return validation error when payload is missing', async () => {
    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation Error');
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors).toEqual([
      {
        field: 'username',
        message: 'Username is required',
      },
      {
        field: 'password',
        message: 'Password is required',
      },
    ]);
  });
});

describe('Get All Students Endpoint Tests', () => {
  test('should fetch all students', async () => {
    const mockPrismaCreateReponse = [
      {
        userId: 'mock-userid1',
        username: 'testuser1',
        email: 'test@example.com',
        role: 'student' as Role,
        mobileNumber: '1234567890',
        profileImage: 'mock-profile-image-data',
        createdAt: new Date(),
        password: 'mock-password',
      },
      {
        userId: 'mock-userid2',
        username: 'testuser2',
        email: 'test2@example.com',
        role: 'student' as Role,
        mobileNumber: '1234567890',
        profileImage: 'mock-profile-image-data',
        createdAt: new Date(),
        password: 'mock-password',
      },
    ];

    prismaMock.user.findMany.mockResolvedValue(mockPrismaCreateReponse);

    mockJwt.verify.mockReturnValue({
      userId: 'mock-user',
      email: 'test@test.com',
      role: Role.educator,
    } as never);

    const response = await request(app)
      .get('/api/auth/user/getAllStudents')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Students fetched successfully');
    expect(response.body.students).toEqual(
      mockPrismaCreateReponse.map((object) => {
        return {
          ...object,
          createdAt: object.createdAt.toISOString(),
        };
      })
    );
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
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access is denied');
    expect(response.body.students).not.toBeDefined();
  });

  test('should throw error when no token is provided', async () => {
    const response = await request(app).get('/api/auth/user/getAllStudents');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
  });

  test('should throw error when jwt throws error', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Jwt Error');
    });

    const response = await request(app)
      .get('/api/auth/user/getAllStudents')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Jwt Error'
    );
  });

  test('should search students by username or email', async () => {
    const mockPrismaCreateReponse = [
      {
        userId: 'mock-userid1',
        username: 'testuser1',
        email: 't@example.com',
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

    prismaMock.user.findMany.mockResolvedValue(mockPrismaCreateReponse);

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
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Students fetched successfully');
    expect(response.body.students).toEqual(
      mockPrismaCreateReponse.map((object) => {
        return {
          ...object,
          createdAt: object.createdAt.toISOString(),
        };
      })
    );
  });

  test('should sort students by username or email', async () => {
    const mockPrismaCreateReponse = [
      {
        userId: 'mock-userid1',
        username: 'atestuser1',
        email: 'test@example.com',
        role: 'student' as Role,
        mobileNumber: '1234567890',
        profileImage: 'mock-profile-image-data',
        createdAt: new Date(),
        password: 'mock-password',
      },
      {
        userId: 'mock-userid2',
        username: 'btestuser2',
        email: 'test2@example.com',
        role: 'student' as Role,
        mobileNumber: '1234567890',
        profileImage: 'mock-profile-image-data',
        createdAt: new Date(),
        password: 'mock-password',
      },
    ];

    prismaMock.user.findMany.mockResolvedValue(mockPrismaCreateReponse);

    mockJwt.verify.mockReturnValue({
      userId: 'mock-user',
      email: 'test@test.com',
      role: Role.educator,
    } as never);

    const response = await request(app)
      .get('/api/auth/user/getAllStudents?sortBy=email&order=desc')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Students fetched successfully');
    expect(response.body.students).toEqual(
      mockPrismaCreateReponse.map((object) => {
        return {
          ...object,
          createdAt: object.createdAt.toISOString(),
        };
      })
    );
  });
});
