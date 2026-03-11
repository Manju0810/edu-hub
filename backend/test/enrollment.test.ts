import { beforeEach, describe, jest, test, expect } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { EnrollmentStatus, Role } from '@prisma/client';
import type { DeepMockProxy } from 'jest-mock-extended';
import { mockDeep, mockReset } from 'jest-mock-extended';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { app } from '../src/app';
import { prisma } from '../src/prisma';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    verify: jest.fn(),
    sign: jest.fn(),
  },
}));

jest.mock('../src/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

const mockJwt = jest.mocked(jwt);
const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

const createMockEnrollment = (overrides = {}): any => ({
  enrollmentId: 'enrollment-id',
  userId: 'user-id',
  courseId: 'course-id',
  enrollmentDate: new Date('2026-01-01'),
  status: EnrollmentStatus.Pending,
  ...overrides,
});

describe('Add Enrollment Endpoint Tests', () => {
  const mockValidEnrollPayload = {
    userId: 'valid-user-id',
    courseId: 'valid-course-id',
  };

  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  const mockStudentAuthPayload = {
    userId: 'mock-student-id',
    email: 'student@test.com',
    role: Role.student,
  };

  test('should add enrollment with valid data', async () => {
    const mockPrismaCreateResponse = createMockEnrollment({
      enrollmentId: 'mock-enrollment-id',
      userId: mockValidEnrollPayload.userId,
      courseId: mockValidEnrollPayload.courseId,
    });

    prismaMock.enrollment.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      userId: mockValidEnrollPayload.userId,
    } as any);
    prismaMock.course.findUnique.mockResolvedValue({
      courseId: mockValidEnrollPayload.courseId,
    } as any);
    prismaMock.enrollment.create.mockResolvedValue(mockPrismaCreateResponse);

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .post('/api/enroll/addEnroll')
      .send(mockValidEnrollPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Enrollment added successfully');
    expect(response.body.enrollment).toEqual({
      ...mockPrismaCreateResponse,
      enrollmentDate: mockPrismaCreateResponse.enrollmentDate.toISOString(),
    });
  });

  test('should return validation error when mandatory fields are missing', async () => {
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .post('/api/enroll/addEnroll')
      .send({})
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation Error');
    expect(response.body.enrollment).not.toBeDefined();
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled();
  });

  test('should return error when enrollment already exists', async () => {
    const existingEnrollment = createMockEnrollment({
      enrollmentId: 'existing-enrollment-id',
      userId: mockValidEnrollPayload.userId,
      courseId: mockValidEnrollPayload.courseId,
    });

    prismaMock.enrollment.findFirst.mockResolvedValue(existingEnrollment);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .post('/api/enroll/addEnroll')
      .send(mockValidEnrollPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Enrollment already exists for this user and course'
    );
    expect(response.body.enrollment).not.toBeDefined();
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled();
  });

  test('should return 404 when user does not exist', async () => {
    prismaMock.enrollment.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .post('/api/enroll/addEnroll')
      .send(mockValidEnrollPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('User not found');
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled();
  });

  test('should return 404 when course does not exist', async () => {
    prismaMock.enrollment.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      userId: mockValidEnrollPayload.userId,
    } as any);
    prismaMock.course.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .post('/api/enroll/addEnroll')
      .send(mockValidEnrollPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Course not found');
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.enrollment.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({
      userId: mockValidEnrollPayload.userId,
    } as any);
    prismaMock.course.findUnique.mockResolvedValue({
      courseId: mockValidEnrollPayload.courseId,
    } as any);
    prismaMock.enrollment.create.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .post('/api/enroll/addEnroll')
      .send(mockValidEnrollPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Failed to add enrollment');
    expect(response.body.enrollment).not.toBeDefined();
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app)
      .post('/api/enroll/addEnroll')
      .send(mockValidEnrollPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .post('/api/enroll/addEnroll')
      .send(mockValidEnrollPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Invalid token'
    );
    expect(prismaMock.enrollment.create).not.toHaveBeenCalled();
  });
});

describe('Get All Enrollments Endpoint Tests', () => {
  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should fetch all enrollments with pagination', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
      }),
      createMockEnrollment({
        enrollmentId: 'enrollment-2',
        userId: 'user-2',
        courseId: 'course-2',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/enroll/getAllEnrolls')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Enrollments fetched successfully');
    expect(response.body.enrollments).toHaveLength(2);
    expect(response.body.count).toBe(2);
    expect(response.body.enrollments).toEqual(
      mockEnrollments.map((enrollment) => ({
        ...enrollment,
        enrollmentDate: enrollment.enrollmentDate.toISOString(),
      }))
    );
  });

  test('should fetch enrollments with pagination parameters', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/enroll/getAllEnrolls?page=2&limit=5')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      })
    );
  });

  test('should search enrollments by user or course', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    prismaMock.user.findMany.mockResolvedValue([{ userId: 'user-1' } as any]);
    prismaMock.course.findMany.mockResolvedValue([
      { courseId: 'course-1' } as any,
    ]);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/enroll/getAllEnrolls?search=test')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { username: { contains: 'test', mode: 'insensitive' } },
            { email: { contains: 'test', mode: 'insensitive' } },
          ]),
        }),
      })
    );
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { title: { contains: 'test', mode: 'insensitive' } },
            { description: { contains: 'test', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  test('should sort enrollments by allowed fields', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    await request(app)
      .get('/api/enroll/getAllEnrolls?sortBy=enrollmentDate&order=asc')
      .set('Cookie', 'token=fake-token');
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { enrollmentDate: 'asc' },
      })
    );

    await request(app)
      .get('/api/enroll/getAllEnrolls?sortBy=status&order=desc')
      .set('Cookie', 'token=fake-token');
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { status: 'desc' },
      })
    );
  });

  test('should default to enrollmentDate sorting when invalid sortBy provided', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: 'user-1',
        courseId: 'course-1',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/enroll/getAllEnrolls?sortBy=invalidField')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { enrollmentDate: 'desc' },
      })
    );
  });

  test('should return empty array when no enrollments exist', async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/enroll/getAllEnrolls')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.enrollments).toEqual([]);
    expect(response.body.count).toBe(0);
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.enrollment.findMany.mockRejectedValue(
      new Error('Database error')
    );
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/enroll/getAllEnrolls')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Failed to fetch enrollments');
    expect(response.body.enrollments).not.toBeDefined();
  });
});

describe('Get Enrollment By EnrollmentId Endpoint Tests', () => {
  const mockEnrollmentId = 'existing-enrollment-id';

  test('should fetch enrollment by valid enrollmentId', async () => {
    const mockEnrollment = createMockEnrollment({
      enrollmentId: mockEnrollmentId,
      userId: 'user-1',
      courseId: 'course-1',
    });

    prismaMock.enrollment.findUnique.mockResolvedValue(mockEnrollment);

    const response = await request(app).get(
      `/api/enroll/getEnrollByEnrollId/${mockEnrollmentId}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Enrollment fetched successfully');
    expect(response.body.enrollment).toEqual({
      ...mockEnrollment,
      enrollmentDate: mockEnrollment.enrollmentDate.toISOString(),
    });
  });

  test('should return 404 when enrollment not found', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(null);

    const response = await request(app).get(
      `/api/enroll/getEnrollByEnrollId/${mockEnrollmentId}`
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Enrollment not found');
    expect(response.body.enrollment).not.toBeDefined();
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.enrollment.findUnique.mockRejectedValue(
      new Error('Database error')
    );

    const response = await request(app).get(
      `/api/enroll/getEnrollByEnrollId/${mockEnrollmentId}`
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Failed to fetch enrollment');
    expect(response.body.enrollment).not.toBeDefined();
  });

  test('should handle invalid enrollmentId format', async () => {
    const response = await request(app).get(
      '/api/enroll/getEnrollByEnrollId/invalid-id'
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Enrollment not found');
  });
});

describe('Get Enrollments By UserId Endpoint Tests', () => {
  const mockUserId = 'user-1';
  const mockStudentAuthPayload = {
    userId: 'mock-student-id',
    email: 'student@test.com',
    role: Role.student,
  };

  test('should fetch enrollments by valid userId', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: mockUserId,
        courseId: 'course-1',
      }),
      createMockEnrollment({
        enrollmentId: 'enrollment-2',
        userId: mockUserId,
        courseId: 'course-2',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByUserId/${mockUserId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Enrollments fetched successfully');
    expect(response.body.enrollments).toHaveLength(2);
    expect(response.body.enrollments).toEqual(
      mockEnrollments.map((enrollment) => ({
        ...enrollment,
        enrollmentDate: enrollment.enrollmentDate.toISOString(),
      }))
    );
  });

  test('should return 404 when no enrollments found for userId', async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByUserId/${mockUserId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'No enrollments found for the given user ID'
    );
    expect(response.body.enrollments).not.toBeDefined();
  });

  test('should fetch enrollments with pagination for userId', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: mockUserId,
        courseId: 'course-1',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByUserId/${mockUserId}?page=1&limit=5`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 5,
        where: expect.objectContaining({
          userId: mockUserId,
        }),
      })
    );
  });

  test('should search enrollments by course for userId', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: mockUserId,
        courseId: 'course-1',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    prismaMock.course.findMany.mockResolvedValue([
      { courseId: 'course-1' } as any,
    ]);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByUserId/${mockUserId}?search=react`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { title: { contains: 'react', mode: 'insensitive' } },
            { description: { contains: 'react', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  test('should sort enrollments by allowed fields for userId', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: mockUserId,
        courseId: 'course-1',
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .get(
        `/api/enroll/getEnrollsByUserId/${mockUserId}?sortBy=status&order=desc`
      )
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { status: 'desc' },
      })
    );
  });

  test('should return error when prisma throws error for userId', async () => {
    prismaMock.enrollment.findMany.mockRejectedValue(
      new Error('Database error')
    );
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByUserId/${mockUserId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Failed to fetch enrollments');
  });
});

describe('Get Enrollments By CourseId Endpoint Tests', () => {
  const mockCourseId = 'course-1';
  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should fetch enrollments by valid courseId', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: 'user-1',
        courseId: mockCourseId,
      }),
      createMockEnrollment({
        enrollmentId: 'enrollment-2',
        userId: 'user-2',
        courseId: mockCourseId,
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Enrollments fetched successfully');
    expect(response.body.enrollments).toHaveLength(2);
    expect(response.body.enrollments).toEqual(
      mockEnrollments.map((enrollment) => ({
        ...enrollment,
        enrollmentDate: enrollment.enrollmentDate.toISOString(),
      }))
    );
  });

  test('should return 404 when no enrollments found for courseId', async () => {
    prismaMock.enrollment.findMany.mockResolvedValue([]);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'No enrollments found for the given course ID'
    );
    expect(response.body.enrollments).not.toBeDefined();
  });

  test('should fetch enrollments with pagination for courseId', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: 'user-1',
        courseId: mockCourseId,
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByCourseId/${mockCourseId}?page=1&limit=5`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 5,
        where: expect.objectContaining({
          courseId: mockCourseId,
        }),
      })
    );
  });

  test('should search enrollments by user for courseId', async () => {
    const mockEnrollments = [
      createMockEnrollment({
        enrollmentId: 'enrollment-1',
        userId: 'user-1',
        courseId: mockCourseId,
      }),
    ];

    prismaMock.enrollment.findMany.mockResolvedValue(mockEnrollments);
    prismaMock.user.findMany.mockResolvedValue([{ userId: 'user-1' } as any]);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByCourseId/${mockCourseId}?search=john`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { username: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  test('should return error when prisma throws error for courseId', async () => {
    prismaMock.enrollment.findMany.mockRejectedValue(
      new Error('Database error')
    );
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/enroll/getEnrollsByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Failed to fetch enrollments');
  });
});

describe('Update Enrollment Endpoint Tests', () => {
  const mockEnrollmentId = 'existing-enrollment-id';
  const mockStudentAuthPayload = {
    userId: 'student-1',
    email: 'student@test.com',
    role: Role.student,
  };
  const mockValidUpdatePayload = {
    status: 'Accepted' as EnrollmentStatus,
  };

  test('should update enrollment with valid data', async () => {
    const mockExistingEnrollment = createMockEnrollment({
      enrollmentId: mockEnrollmentId,
      status: EnrollmentStatus.Pending,
    });
    const mockUpdatedEnrollment = createMockEnrollment({
      enrollmentId: mockEnrollmentId,
      status: mockValidUpdatePayload.status,
    });

    prismaMock.enrollment.findUnique.mockResolvedValueOnce(
      mockExistingEnrollment
    );
    prismaMock.enrollment.update.mockResolvedValue(mockUpdatedEnrollment);

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .put(`/api/enroll/updateEnrollByEnrollID/${mockEnrollmentId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Enrollment updated successfully');
    expect(response.body.enrollment).toEqual({
      ...mockUpdatedEnrollment,
      enrollmentDate: mockUpdatedEnrollment.enrollmentDate.toISOString(),
    });
  });

  test('should return validation error when status is missing', async () => {
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .put(`/api/enroll/updateEnrollByEnrollID/${mockEnrollmentId}`)
      .send({})
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation Error');
    expect(prismaMock.enrollment.update).not.toHaveBeenCalled();
  });

  test('should return 404 when enrollment not found', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .put(`/api/enroll/updateEnrollByEnrollID/${mockEnrollmentId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Enrollment not found');
    expect(prismaMock.enrollment.update).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error during update', async () => {
    const mockExistingEnrollment = createMockEnrollment({
      enrollmentId: mockEnrollmentId,
    });
    prismaMock.enrollment.findUnique.mockResolvedValueOnce(
      mockExistingEnrollment
    );
    prismaMock.enrollment.update.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .put(`/api/enroll/updateEnrollByEnrollID/${mockEnrollmentId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Failed to update enrollment');
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app)
      .put(`/api/enroll/updateEnrollByEnrollID/${mockEnrollmentId}`)
      .send(mockValidUpdatePayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
    expect(prismaMock.enrollment.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .put(`/api/enroll/updateEnrollByEnrollID/${mockEnrollmentId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Invalid token'
    );
    expect(prismaMock.enrollment.findUnique).not.toHaveBeenCalled();
  });
});

describe('Delete Enrollment Endpoint Tests', () => {
  const mockEnrollmentId = 'existing-enrollment-id';
  const mockStudentAuthPayload = {
    userId: 'student-1',
    email: 'student@test.com',
    role: Role.student,
  };

  test('should delete enrollment with valid enrollmentId', async () => {
    const mockExistingEnrollment = createMockEnrollment({
      enrollmentId: mockEnrollmentId,
      userId: 'student-1',
      courseId: 'course-1',
    });
    const mockDeletedEnrollment = createMockEnrollment({
      enrollmentId: mockEnrollmentId,
      userId: 'student-1',
      courseId: 'course-1',
    });

    prismaMock.enrollment.findUnique.mockResolvedValueOnce(
      mockExistingEnrollment
    );
    prismaMock.enrollment.delete.mockResolvedValue(mockDeletedEnrollment);

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .delete(`/api/enroll/deleteEnrollByEnrollID/${mockEnrollmentId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Enrollment deleted successfully');
    expect(response.body['Deleted enrollment details']).toEqual({
      ...mockDeletedEnrollment,
      enrollmentDate: mockDeletedEnrollment.enrollmentDate.toISOString(),
    });
  });

  test('should return 404 when enrollment not found', async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .delete(`/api/enroll/deleteEnrollByEnrollID/${mockEnrollmentId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Enrollment not found');
    expect(prismaMock.enrollment.delete).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error during delete', async () => {
    const mockExistingEnrollment = createMockEnrollment({
      enrollmentId: mockEnrollmentId,
    });
    prismaMock.enrollment.findUnique.mockResolvedValue(mockExistingEnrollment);
    prismaMock.enrollment.delete.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .delete(`/api/enroll/deleteEnrollByEnrollID/${mockEnrollmentId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Failed to delete enrollment');
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app).delete(
      `/api/enroll/deleteEnrollByEnrollID/${mockEnrollmentId}`
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
    expect(prismaMock.enrollment.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .delete(`/api/enroll/deleteEnrollByEnrollID/${mockEnrollmentId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Invalid token'
    );
    expect(prismaMock.enrollment.findUnique).not.toHaveBeenCalled();
  });
});