import { Router } from 'express';

import {
  addEnroll,
  deleteEnrollByEnrollId,
  getAllEnrolls,
  getEnrollByEnrollId,
  getEnrollsByCourseId,
  getEnrollsByUserId,
  updateEnrollByEnrollId,
} from '../controllers/enrollment';
import { createRoute } from '../lib/createRoute';
import { verifyToken } from '../middlewares/auth';
import {
  AddEnrollSchema,
  EnrollmentSchema,
  EnrollmentsResponseSchema,
  ErrorResponseSchema,
  EnrollmentQuerySchema,
  EnrollmentIdParamSchema,
  CourseIdParamSchema,
  UserIdParamSchema,
  UpdateEnrollSchema,
} from '../validation/schemas';

const router = Router();

// Get all enrollments with pagination and search
createRoute(router, {
  method: 'get',
  path: '/api/enroll/getAllEnrolls',
  summary: 'Get all enrollments with pagination and search',
  middlewares: [verifyToken],
  request: {
    query: EnrollmentQuerySchema,
  },
  responses: {
    200: EnrollmentsResponseSchema,
    400: ErrorResponseSchema,
  },
  handler: getAllEnrolls,
});

// Add new enrollment
createRoute(router, {
  method: 'post',
  path: '/api/enroll/addEnroll',
  summary: 'Add new enrollment',
  middlewares: [verifyToken],
  request: {
    body: AddEnrollSchema,
  },
  responses: {
    200: EnrollmentSchema,
    400: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: addEnroll,
});

// Get enrollment by enrollment ID
createRoute(router, {
  method: 'get',
  path: '/api/enroll/getEnrollByEnrollId/:enrollId',
  summary: 'Get enrollment by enrollment ID',
  request: {
    params: EnrollmentIdParamSchema,
  },
  responses: {
    200: EnrollmentSchema,
    404: ErrorResponseSchema,
  },
  handler: getEnrollByEnrollId,
});

// Get enrollments by user ID
createRoute(router, {
  method: 'get',
  path: '/api/enroll/getEnrollsByUserId/:userId',
  summary: 'Get enrollments by user ID',
  middlewares: [verifyToken],
  request: {
    params: UserIdParamSchema,
    query: EnrollmentQuerySchema,
  },
  responses: {
    200: EnrollmentsResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: getEnrollsByUserId,
});

// Get enrollments by course ID
createRoute(router, {
  method: 'get',
  path: '/api/enroll/getEnrollsByCourseId/:courseId',
  summary: 'Get enrollments by course ID',
  middlewares: [verifyToken],
  request: {
    params: CourseIdParamSchema,
    query: EnrollmentQuerySchema,
  },
  responses: {
    200: EnrollmentsResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: getEnrollsByCourseId,
});

// Update enrollment status by enrollment ID
createRoute(router, {
  method: 'put',
  path: '/api/enroll/updateEnrollByEnrollID/:enrollId',
  summary: 'Update enrollment status by enrollment ID',
  middlewares: [verifyToken],
  request: {
    params: EnrollmentIdParamSchema,
    body: UpdateEnrollSchema,
  },
  responses: {
    200: EnrollmentSchema,
    400: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: updateEnrollByEnrollId,
});

// Delete enrollment by enrollment ID
createRoute(router, {
  method: 'delete',
  path: '/api/enroll/deleteEnrollByEnrollID/:enrollId',
  summary: 'Delete enrollment by enrollment ID',
  middlewares: [verifyToken],
  request: {
    params: EnrollmentIdParamSchema,
  },
  responses: {
    200: EnrollmentSchema,
    404: ErrorResponseSchema,
  },
  handler: deleteEnrollByEnrollId,
});

export default router;
