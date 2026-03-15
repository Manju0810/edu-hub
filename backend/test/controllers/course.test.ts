import { beforeEach, describe, jest, test, expect } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { Level, Role } from '@prisma/client';
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
  mockJwt.verify.mockClear();
  mockReset(prismaMock);
});

const createMockCourse = (overrides = {}): any => ({
  courseId: 'course-id',
  title: 'Course Title',
  description: 'Course Description',
  courseStartDate: new Date('2026-01-01'),
  courseEndDate: new Date('2026-12-31'),
  category: 'Programming',
  level: 'Beginner' as Level,
  userId: 'educator-1',
  ...overrides,
});

describe('Add Course Endpoint Tests', () => {
  const mockValidCoursePayload = {
    title: 'Test Course',
    description: 'This is a test course description',
    courseStartDate: '2026-01-01T00:00:00.000Z',
    courseEndDate: '2026-12-31T23:59:59.000Z',
    category: 'Programming',
    level: 'Beginner' as Level,
  };

  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should add course with valid data as educator', async () => {
    const mockPrismaCreateResponse = createMockCourse({
      courseId: 'mock-course-id',
      title: mockValidCoursePayload.title,
      description: mockValidCoursePayload.description,
      courseStartDate: new Date(mockValidCoursePayload.courseStartDate),
      courseEndDate: new Date(mockValidCoursePayload.courseEndDate),
      category: mockValidCoursePayload.category,
      level: mockValidCoursePayload.level,
      userId: mockEducatorAuthPayload.userId,
    });

    prismaMock.course.findFirst.mockResolvedValue(null);
    prismaMock.course.create.mockResolvedValue(mockPrismaCreateResponse as any);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/course/addCourse')
      .send(mockValidCoursePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...mockPrismaCreateResponse,
      courseStartDate: mockPrismaCreateResponse.courseStartDate.toISOString(),
      courseEndDate: mockPrismaCreateResponse.courseEndDate.toISOString(),
    });
  });

  test('should return error when user is not educator', async () => {
    const mockStudentAuthPayload = {
      userId: 'mock-student-id',
      email: 'student@test.com',
      role: Role.student,
    };

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .post('/api/course/addCourse')
      .send(mockValidCoursePayload)
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
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });

  test('should return validation error when mandatory fields are missing', async () => {
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/course/addCourse')
      .send({})
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        { field: 'title', message: 'Title is required' },
        { field: 'description', message: 'Description is required' },
        {
          field: 'courseStartDate',
          message: 'Course start date is required',
        },
        {
          field: 'courseEndDate',
          message: 'Course end date is required',
        },
        { field: 'category', message: 'Category is required' },
        {
          field: 'level',
          message:
            "Level must be either 'Beginner', 'Intermediate', or 'Advanced'",
        },
      ],
    });
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });

  test('should return error when course with same title exists', async () => {
    const existingCourse = createMockCourse({
      courseId: 'existing-course-id',
      title: mockValidCoursePayload.title,
    });

    prismaMock.course.findFirst.mockResolvedValue(existingCourse as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/course/addCourse')
      .send(mockValidCoursePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'title',
          message: 'Course with this title already exists',
        },
      ],
    });
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.course.findFirst.mockResolvedValue(null);
    prismaMock.course.create.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/course/addCourse')
      .send(mockValidCoursePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Failed to add course',
        },
      ],
    });
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app)
      .post('/api/course/addCourse')
      .send(mockValidCoursePayload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'token',
          message: 'No token - Unauthorized',
        },
      ],
    });
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .post('/api/course/addCourse')
      .send(mockValidCoursePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'token',
          message: 'Invalid token - Unauthorized: Invalid token',
        },
      ],
    });
    expect(prismaMock.course.create).not.toHaveBeenCalled();
  });
});

describe('Get All Courses Endpoint Tests', () => {
  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should fetch all courses with pagination', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'Course 1',
        description: 'Description 1',
      }),
      createMockCourse({
        courseId: 'course-2',
        title: 'Course 2',
        description: 'Description 2',
        userId: 'educator-2',
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/course/getAllCourses')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      courses: mockCourses.map((course) => ({
        ...course,
        courseStartDate: course.courseStartDate.toISOString(),
        courseEndDate: course.courseEndDate.toISOString(),
      })),
      count: mockCourses.length,
    });
  });

  test('should fetch courses with pagination parameters', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'Course 1',
        description: 'Description 1',
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/course/getAllCourses?page=2&limit=5')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(200);
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
      })
    );
  });

  test('should search courses by title or description', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'React Basics',
        description: 'Learn React basics',
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/course/getAllCourses?search=react')
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

  test('should sort courses by allowed fields', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'A Course',
        description: 'Description',
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    await request(app)
      .get('/api/course/getAllCourses?sortBy=title&order=asc')
      .set('Cookie', 'token=fake-token');
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { title: 'asc' },
      })
    );

    await request(app)
      .get('/api/course/getAllCourses?sortBy=level&order=desc')
      .set('Cookie', 'token=fake-token');
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { level: 'desc' },
      })
    );
  });

  test('should return error when invalid sortBy provided', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'Course',
        description: 'Description',
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/course/getAllCourses?sortBy=invalidField')
      .set('Cookie', 'token=fake-token');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'sortBy',
          message:
            'Invalid option: expected one of "title"|"level"|"category"|"courseStartDate"|"courseEndDate"',
        },
      ],
    });
  });

  test('should return empty array when no courses exist', async () => {
    prismaMock.course.findMany.mockResolvedValue([]);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/course/getAllCourses')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      courses: [],
      count: 0,
    });
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.course.findMany.mockRejectedValue(new Error('Database error'));
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get('/api/course/getAllCourses')
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Failed to fetch courses',
        },
      ],
    });
  });
});

describe('Get Course By CourseId Endpoint Tests', () => {
  const mockCourseId = 'existing-course-id';

  test('should fetch course by valid courseId', async () => {
    const mockCourse = createMockCourse({
      courseId: mockCourseId,
      title: 'Test Course',
      description: 'Test Description',
    });

    prismaMock.course.findUnique.mockResolvedValue(mockCourse as any);

    const response = await request(app).get(
      `/api/course/getCourseByCourseId/${mockCourseId}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...mockCourse,
      courseStartDate: mockCourse.courseStartDate.toISOString(),
      courseEndDate: mockCourse.courseEndDate.toISOString(),
    });
  });

  test('should return 404 when course not found', async () => {
    prismaMock.course.findUnique.mockResolvedValue(null);

    const response = await request(app).get(
      `/api/course/getCourseByCourseId/${mockCourseId}`
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'courseId',
          message: 'Course not found',
        },
      ],
    });
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.course.findUnique.mockRejectedValue(new Error('Database error'));

    const response = await request(app).get(
      `/api/course/getCourseByCourseId/${mockCourseId}`
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Failed to fetch course',
        },
      ],
    });
  });

  test('should handle invalid courseId format', async () => {
    const response = await request(app).get(
      '/api/course/getCourseByCourseId/invalid-id'
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'courseId',
          message: 'Course not found',
        },
      ],
    });
  });
});

describe('Get Courses By UserId Endpoint Tests', () => {
  const mockUserId = 'educator-1';
  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should fetch courses by valid userId', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'Course 1',
        description: 'Description 1',
        userId: mockUserId,
      }),
      createMockCourse({
        courseId: 'course-2',
        title: 'Course 2',
        description: 'Description 2',
        userId: mockUserId,
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/course/getCoursesByUserId/${mockUserId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      mockCourses.map((course) => ({
        ...course,
        courseStartDate: course.courseStartDate.toISOString(),
        courseEndDate: course.courseEndDate.toISOString(),
      }))
    );
  });

  test('should return 404 when no courses found for userId', async () => {
    prismaMock.course.findMany.mockResolvedValue([]);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/course/getCoursesByUserId/${mockUserId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'userId',
          message: 'No courses were created by the given user ID',
        },
      ],
    });
  });

  test('should fetch courses with pagination for userId', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'Course 1',
        description: 'Description 1',
        userId: mockUserId,
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/course/getCoursesByUserId/${mockUserId}?page=1&limit=5`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 5,
        where: expect.objectContaining({
          userId: mockUserId,
        }),
      })
    );
  });

  test('should search courses by title or description for userId', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'React Course',
        description: 'Learn React',
        userId: mockUserId,
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/course/getCoursesByUserId/${mockUserId}?search=react`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: mockUserId,
          OR: expect.arrayContaining([
            { title: { contains: 'react', mode: 'insensitive' } },
            { description: { contains: 'react', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  test('should sort courses by allowed fields for userId', async () => {
    const mockCourses = [
      createMockCourse({
        courseId: 'course-1',
        title: 'Course',
        description: 'Description',
        userId: mockUserId,
      }),
    ];

    prismaMock.course.findMany.mockResolvedValue(mockCourses as any);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(
        `/api/course/getCoursesByUserId/${mockUserId}?sortBy=category&order=desc`
      )
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(prismaMock.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { category: 'desc' },
      })
    );
  });

  test('should return error when prisma throws error for userId', async () => {
    prismaMock.course.findMany.mockRejectedValue(new Error('Database error'));
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/course/getCoursesByUserId/${mockUserId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Failed to fetch courses',
        },
      ],
    });
  });
});

describe('Update Course Endpoint Tests', () => {
  const mockCourseId = 'existing-course-id';
  const mockEducatorAuthPayload = {
    userId: 'educator-1',
    email: 'educator@test.com',
    role: Role.educator,
  };
  const mockValidUpdatePayload = {
    title: 'Updated Course Title',
    description: 'Updated course description',
    courseStartDate: '2026-02-01T00:00:00.000Z',
    courseEndDate: '2026-08-31T23:59:59.000Z',
    category: 'Web Development',
    level: 'Intermediate' as Level,
  };

  test('should update course with valid data as educator', async () => {
    const mockExistingCourse = createMockCourse({
      courseId: mockCourseId,
      userId: 'educator-1',
    });
    const mockUpdatedCourse = createMockCourse({
      courseId: mockCourseId,
      title: mockValidUpdatePayload.title,
      description: mockValidUpdatePayload.description,
      courseStartDate: new Date(mockValidUpdatePayload.courseStartDate),
      courseEndDate: new Date(mockValidUpdatePayload.courseEndDate),
      category: mockValidUpdatePayload.category,
      level: mockValidUpdatePayload.level,
      userId: 'educator-1',
    });

    prismaMock.course.findUnique.mockResolvedValueOnce(
      mockExistingCourse as any
    );
    prismaMock.course.update.mockResolvedValue(mockUpdatedCourse as any);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .put(`/api/course/updateCourseByCourseId/${mockCourseId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...mockUpdatedCourse,
      courseStartDate: mockUpdatedCourse.courseStartDate.toISOString(),
      courseEndDate: mockUpdatedCourse.courseEndDate.toISOString(),
    });
  });

  test('should return error when user is not educator', async () => {
    const mockStudentAuthPayload = {
      userId: 'student-1',
      email: 'student@test.com',
      role: Role.student,
    };

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .put(`/api/course/updateCourseByCourseId/${mockCourseId}`)
      .send(mockValidUpdatePayload)
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
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });

  test('should return 404 when course not found', async () => {
    prismaMock.course.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .put(`/api/course/updateCourseByCourseId/${mockCourseId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'courseId',
          message: 'Course not found',
        },
      ],
    });
    expect(prismaMock.course.update).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error during update', async () => {
    const mockExistingCourse = createMockCourse({
      courseId: mockCourseId,
      userId: 'educator-1',
    });
    prismaMock.course.findUnique.mockResolvedValueOnce(
      mockExistingCourse as any
    );
    prismaMock.course.update.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .put(`/api/course/updateCourseByCourseId/${mockCourseId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Failed to update course : Error: Database error',
        },
      ],
    });
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app)
      .put(`/api/course/updateCourseByCourseId/${mockCourseId}`)
      .send(mockValidUpdatePayload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'token',
          message: 'No token - Unauthorized',
        },
      ],
    });
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .put(`/api/course/updateCourseByCourseId/${mockCourseId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'token',
          message: 'Invalid token - Unauthorized: Invalid token',
        },
      ],
    });
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });
});

describe('Delete Course Endpoint Tests', () => {
  const mockCourseId = 'existing-course-id';
  const mockEducatorAuthPayload = {
    userId: 'educator-1',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should delete course with valid courseId as educator', async () => {
    const mockExistingCourse = createMockCourse({
      courseId: mockCourseId,
      userId: 'educator-1',
    });
    const mockDeletedCourse = createMockCourse({
      courseId: mockCourseId,
      title: 'Test Course',
      description: 'Test Description',
      userId: 'educator-1',
    });

    prismaMock.course.findUnique.mockResolvedValueOnce(
      mockExistingCourse as any
    );
    prismaMock.course.delete.mockResolvedValue(mockDeletedCourse as any);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .delete(`/api/course/deleteCourseByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...mockDeletedCourse,
      courseStartDate: mockDeletedCourse.courseStartDate.toISOString(),
      courseEndDate: mockDeletedCourse.courseEndDate.toISOString(),
    });
  });

  test('should return error when user is not educator', async () => {
    const mockStudentAuthPayload = {
      userId: 'student-1',
      email: 'student@test.com',
      role: Role.student,
    };

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .delete(`/api/course/deleteCourseByCourseId/${mockCourseId}`)
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
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });

  test('should return 404 when course not found', async () => {
    prismaMock.course.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .delete(`/api/course/deleteCourseByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'courseId',
          message: 'Course not found',
        },
      ],
    });
    expect(prismaMock.course.delete).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error during delete', async () => {
    const mockExistingCourse = createMockCourse({
      courseId: mockCourseId,
      userId: 'educator-1',
    });
    prismaMock.course.findUnique.mockResolvedValueOnce(
      mockExistingCourse as any
    );
    prismaMock.course.delete.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .delete(`/api/course/deleteCourseByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          message: 'Failed to delete course : Error: Database error',
        },
      ],
    });
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app).delete(
      `/api/course/deleteCourseByCourseId/${mockCourseId}`
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'token',
          message: 'No token - Unauthorized',
        },
      ],
    });
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .delete(`/api/course/deleteCourseByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      errors: [
        {
          field: 'token',
          message: 'Invalid token - Unauthorized: Invalid token',
        },
      ],
    });
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });
});
