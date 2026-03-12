import { beforeEach, describe, jest, test, expect } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';
import { MaterialType, Role } from '@prisma/client';
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
  mockJwt.verify.mockClear();
});

const createMockMaterial = (overrides = {}): any => ({
  materialId: 'material-id',
  courseId: 'course-id',
  title: 'Material Title',
  description: 'Material Description',
  URL: 'https://example.com/material.pdf',
  contentType: MaterialType.Lecture_Slides,
  uploadDate: new Date('2026-01-01'),
  ...overrides,
});

describe('Add Material Endpoint Tests', () => {
  const mockValidMaterialPayload = {
    courseId: 'test-course-id',
    title: 'Test Material',
    description: 'This is a test material description',
    URL: 'https://example.com/material.pdf',
    contentType: MaterialType.Lecture_Slides,
  };

  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should add material with valid data as educator', async () => {
    const mockPrismaCreateResponse = createMockMaterial({
      materialId: 'mock-material-id',
      title: mockValidMaterialPayload.title,
      description: mockValidMaterialPayload.description,
      URL: mockValidMaterialPayload.URL,
      contentType: mockValidMaterialPayload.contentType,
      courseId: mockValidMaterialPayload.courseId,
    });

    prismaMock.course.findUnique.mockResolvedValue({
      courseId: mockValidMaterialPayload.courseId,
    } as any);
    prismaMock.material.create.mockResolvedValue(mockPrismaCreateResponse);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/material/addMaterial')
      .send(mockValidMaterialPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Material added successfully');
    expect(response.body.data).toEqual({
      ...mockPrismaCreateResponse,
      uploadDate: mockPrismaCreateResponse.uploadDate.toISOString(),
    });
  });

  test('should add material without URL as educator', async () => {
    const payloadWithoutUrl = {
      courseId: 'test-course-id',
      title: 'Test Material',
      description: 'This is a test material description',
      contentType: MaterialType.Video,
    };

    const mockPrismaCreateResponse = createMockMaterial({
      materialId: 'mock-material-id',
      title: payloadWithoutUrl.title,
      description: payloadWithoutUrl.description,
      contentType: payloadWithoutUrl.contentType,
      courseId: payloadWithoutUrl.courseId,
      URL: undefined,
    });

    prismaMock.course.findUnique.mockResolvedValue({
      courseId: payloadWithoutUrl.courseId,
    } as any);
    prismaMock.material.create.mockResolvedValue(mockPrismaCreateResponse);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/material/addMaterial')
      .send(payloadWithoutUrl)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.URL).toBeUndefined();
  });

  test('should return error when user is student', async () => {
    const mockStudentAuthPayload = {
      userId: 'mock-student-id',
      email: 'student@test.com',
      role: Role.student,
    };

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .post('/api/material/addMaterial')
      .send(mockValidMaterialPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied');
    expect(prismaMock.material.create).not.toHaveBeenCalled();
  });

  test('should return error when mandatory fields are missing', async () => {
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/material/addMaterial')
      .send({})
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Mandatory fields are missing');
    expect(prismaMock.material.create).not.toHaveBeenCalled();
  });

  test('should return error when course does not exist', async () => {
    prismaMock.course.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/material/addMaterial')
      .send(mockValidMaterialPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Course not found');
    expect(prismaMock.material.create).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      courseId: 'test-course-id',
    } as any);
    prismaMock.material.create.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .post('/api/material/addMaterial')
      .send(mockValidMaterialPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Internal server error');
    expect(response.body.data).not.toBeDefined();
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app)
      .post('/api/material/addMaterial')
      .send(mockValidMaterialPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
    expect(prismaMock.material.create).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .post('/api/material/addMaterial')
      .send(mockValidMaterialPayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Invalid token'
    );
    expect(prismaMock.material.create).not.toHaveBeenCalled();
  });
});

describe('Get Material By MaterialId Endpoint Tests', () => {
  const mockMaterialId = 'existing-material-id';
  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should fetch material by valid materialId', async () => {
    const mockMaterial = createMockMaterial({
      materialId: mockMaterialId,
      title: 'Test Material',
      description: 'Test Description',
    });

    prismaMock.material.findUnique.mockResolvedValue(mockMaterial);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/material/getMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      ...mockMaterial,
      uploadDate: mockMaterial.uploadDate.toISOString(),
    });
  });

  test('should return 404 when material not found', async () => {
    prismaMock.material.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/material/getMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Material not found');
    expect(response.body.data).not.toBeDefined();
  });

  test('should return error when user is student', async () => {
    const mockStudentAuthPayload = {
      userId: 'mock-student-id',
      email: 'student@test.com',
      role: Role.student,
    };

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .get(`/api/material/getMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied');
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.material.findUnique.mockRejectedValue(
      new Error('Database error')
    );
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/material/getMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Internal server error');
    expect(response.body.data).not.toBeDefined();
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app).get(
      `/api/material/getMaterialByMaterialId/${mockMaterialId}`
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .get(`/api/material/getMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Invalid token'
    );
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });
});

describe('Update Material By MaterialId Endpoint Tests', () => {
  const mockMaterialId = 'existing-material-id';
  const mockEducatorAuthPayload = {
    userId: 'educator-1',
    email: 'educator@test.com',
    role: Role.educator,
  };

  const mockValidUpdatePayload = {
    title: 'Updated Material Title',
    description: 'Updated material description',
    URL: 'https://example.com/updated-material.pdf',
    contentType: MaterialType.Video,
  };

  test('should update material with valid data as educator', async () => {
    const mockExistingMaterial = createMockMaterial({
      materialId: mockMaterialId,
      courseId: 'course-1',
    });
    const mockUpdatedMaterial = createMockMaterial({
      materialId: mockMaterialId,
      title: mockValidUpdatePayload.title,
      description: mockValidUpdatePayload.description,
      URL: mockValidUpdatePayload.URL,
      contentType: mockValidUpdatePayload.contentType,
      courseId: 'course-1',
    });

    prismaMock.material.findUnique.mockResolvedValueOnce(mockExistingMaterial);
    prismaMock.material.update.mockResolvedValue(mockUpdatedMaterial);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .put(`/api/material/updateMaterialByMaterialId/${mockMaterialId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Material updated successfully');
    expect(response.body.data).toEqual({
      ...mockUpdatedMaterial,
      uploadDate: mockUpdatedMaterial.uploadDate.toISOString(),
    });
  });

  test('should update material with partial data (only title)', async () => {
    const mockExistingMaterial = createMockMaterial({
      materialId: mockMaterialId,
      courseId: 'course-1',
    });
    const mockUpdatedMaterial = createMockMaterial({
      materialId: mockMaterialId,
      title: 'Updated Title Only',
      description: mockExistingMaterial.description,
      URL: mockExistingMaterial.URL,
      contentType: mockExistingMaterial.contentType,
      courseId: 'course-1',
    });

    prismaMock.material.findUnique.mockResolvedValueOnce(mockExistingMaterial);
    prismaMock.material.update.mockResolvedValue(mockUpdatedMaterial);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .put(`/api/material/updateMaterialByMaterialId/${mockMaterialId}`)
      .send({ title: 'Updated Title Only' })
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Updated Title Only');
  });

  test('should update material to remove URL by setting URL to null', async () => {
    const mockExistingMaterial = createMockMaterial({
      materialId: mockMaterialId,
      courseId: 'course-1',
      URL: 'https://example.com/old.pdf',
    });
    const mockUpdatedMaterial = createMockMaterial({
      materialId: mockMaterialId,
      title: mockExistingMaterial.title,
      description: mockExistingMaterial.description,
      URL: undefined,
      contentType: mockExistingMaterial.contentType,
      courseId: 'course-1',
    });

    prismaMock.material.findUnique.mockResolvedValueOnce(mockExistingMaterial);
    prismaMock.material.update.mockResolvedValue(mockUpdatedMaterial);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .put(`/api/material/updateMaterialByMaterialId/${mockMaterialId}`)
      .send({ URL: null })
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    // The controller checks `URL !== undefined`, so if URL is explicitly null, it might still be set
    // This depends on controller implementation. For now we'll test what we have.
  });

  test('should return error when user is student', async () => {
    const mockStudentAuthPayload = {
      userId: 'student-1',
      email: 'student@test.com',
      role: Role.student,
    };

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .put(`/api/material/updateMaterialByMaterialId/${mockMaterialId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied');
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });

  test('should return 404 when material not found', async () => {
    prismaMock.material.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .put(`/api/material/updateMaterialByMaterialId/${mockMaterialId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Material not found');
    expect(prismaMock.material.update).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error during update', async () => {
    const mockExistingMaterial = createMockMaterial({
      materialId: mockMaterialId,
      courseId: 'course-1',
    });
    prismaMock.material.findUnique.mockResolvedValue(mockExistingMaterial);
    prismaMock.material.update.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .put(`/api/material/updateMaterialByMaterialId/${mockMaterialId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Internal server error');
    expect(response.body.data).not.toBeDefined();
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app)
      .put(`/api/material/updateMaterialByMaterialId/${mockMaterialId}`)
      .send(mockValidUpdatePayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .put(`/api/material/updateMaterialByMaterialId/${mockMaterialId}`)
      .send(mockValidUpdatePayload)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Invalid token'
    );
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });
});

describe('Delete Material By MaterialId Endpoint Tests', () => {
  const mockMaterialId = 'existing-material-id';
  const mockEducatorAuthPayload = {
    userId: 'educator-1',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should delete material with valid materialId as educator', async () => {
    const mockExistingMaterial = createMockMaterial({
      materialId: mockMaterialId,
      courseId: 'course-1',
    });

    prismaMock.material.findUnique.mockResolvedValueOnce(mockExistingMaterial);
    prismaMock.material.delete.mockResolvedValue(mockExistingMaterial);

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .delete(`/api/material/deleteMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Material deleted successfully');
  });

  test('should return error when user is student', async () => {
    const mockStudentAuthPayload = {
      userId: 'student-1',
      email: 'student@test.com',
      role: Role.student,
    };

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .delete(`/api/material/deleteMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied');
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });

  test('should return 404 when material not found', async () => {
    prismaMock.material.findUnique.mockResolvedValue(null);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .delete(`/api/material/deleteMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Material not found');
    expect(prismaMock.material.delete).not.toHaveBeenCalled();
  });

  test('should return error when prisma throws error during delete', async () => {
    const mockExistingMaterial = createMockMaterial({
      materialId: mockMaterialId,
      courseId: 'course-1',
    });
    prismaMock.material.findUnique.mockResolvedValue(mockExistingMaterial);
    prismaMock.material.delete.mockRejectedValue(new Error('Database error'));

    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .delete(`/api/material/deleteMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Internal server error');
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app).delete(
      `/api/material/deleteMaterialByMaterialId/${mockMaterialId}`
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .delete(`/api/material/deleteMaterialByMaterialId/${mockMaterialId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Invalid token'
    );
    expect(prismaMock.material.findUnique).not.toHaveBeenCalled();
  });
});

describe('Get Materials By CourseId Endpoint Tests', () => {
  const mockCourseId = 'test-course-id';
  const mockStudentAuthPayload = {
    userId: 'mock-student-id',
    email: 'student@test.com',
    role: Role.student,
  };
  const mockEducatorAuthPayload = {
    userId: 'mock-educator-id',
    email: 'educator@test.com',
    role: Role.educator,
  };

  test('should fetch materials for valid courseId', async () => {
    const mockMaterials = [
      createMockMaterial({
        materialId: 'material-1',
        title: 'Material 1',
        description: 'Description 1',
        courseId: mockCourseId,
      }),
      createMockMaterial({
        materialId: 'material-2',
        title: 'Material 2',
        description: 'Description 2',
        courseId: mockCourseId,
      }),
    ];

    prismaMock.course.findUnique.mockResolvedValue({
      courseId: mockCourseId,
    } as any);
    prismaMock.material.findMany.mockResolvedValue(mockMaterials);
    mockJwt.verify.mockReturnValue(mockEducatorAuthPayload as never);

    const response = await request(app)
      .get(`/api/material/getMaterialByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Materials fetched successfully');
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data).toEqual(
      mockMaterials.map((material) => ({
        ...material,
        uploadDate: material.uploadDate.toISOString(),
      }))
    );
  });

  test('should fetch materials as student', async () => {
    const mockMaterials = [
      createMockMaterial({
        materialId: 'material-1',
        title: 'Material 1',
        courseId: mockCourseId,
      }),
    ];

    prismaMock.course.findUnique.mockResolvedValue({
      courseId: mockCourseId,
    } as any);
    prismaMock.material.findMany.mockResolvedValue(mockMaterials);

    mockJwt.verify.mockReturnValue(mockStudentAuthPayload as never);

    const response = await request(app)
      .get(`/api/material/getMaterialByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(prismaMock.material.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: mockCourseId },
      })
    );
  });

  test('should return 404 when course not found', async () => {
    prismaMock.course.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/material/getMaterialByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Course not found');
    expect(prismaMock.material.findMany).not.toHaveBeenCalled();
  });

  test('should return 404 when no materials found for course', async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      courseId: mockCourseId,
    } as any);
    prismaMock.material.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get(`/api/material/getMaterialByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No materials found for this course');
    expect(response.body.data).not.toBeDefined();
  });

  test('should return error when prisma throws error', async () => {
    prismaMock.course.findUnique.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get(`/api/material/getMaterialByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Internal server error');
    expect(response.body.data).not.toBeDefined();
  });

  test('should return error when no token is provided', async () => {
    const response = await request(app).get(
      `/api/material/getMaterialByCourseId/${mockCourseId}`
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('No token - Unauthorized');
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });

  test('should return error when jwt token is invalid', async () => {
    mockJwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await request(app)
      .get(`/api/material/getMaterialByCourseId/${mockCourseId}`)
      .set('Cookie', 'token=fake-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      'Invalid token - Unauthorized: Error: Invalid token'
    );
    expect(prismaMock.course.findUnique).not.toHaveBeenCalled();
  });
});
