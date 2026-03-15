import { Router } from 'express';

import {
  addCourse,
  deleteCourse,
  getAllCourses,
  getCourseByCourseId,
  getCoursesByUserId,
  updateCourse,
} from '../controllers/course';
import { createRoute } from '../lib/createRoute';
import { verifyToken } from '../middlewares/auth';
import {
  CourseBodySchema,
  CourseIdParamSchema,
  CourseQuerySchema,
  CourseSchema,
  CoursesResponseSchema,
  ErrorResponseSchema,
  UpdateCourseBodySchema,
  UserIdParamSchema,
} from '../validation/schemas';

const router = Router();

// Add a new course (Educator only)
createRoute(router, {
  method: 'post',
  path: '/api/course/addCourse',
  summary: 'Add a new course (Educator only)',
  middlewares: [verifyToken],
  request: {
    body: CourseBodySchema,
  },
  responses: {
    200: CourseSchema,
    400: ErrorResponseSchema,
  },
  handler: addCourse,
});

// Get all courses with pagination and search
createRoute(router, {
  method: 'get',
  path: '/api/course/getAllCourses',
  summary: 'Get all courses with pagination and search',
  middlewares: [verifyToken],
  request: {
    query: CourseQuerySchema,
  },
  responses: {
    200: CoursesResponseSchema,
  },
  handler: getAllCourses,
});

// Get course by course ID
createRoute(router, {
  method: 'get',
  path: '/api/course/getCourseByCourseId/:courseId',
  summary: 'Get course by course ID',
  request: {
    params: CourseIdParamSchema,
  },
  responses: {
    200: CourseSchema,
    404: ErrorResponseSchema,
  },
  handler: getCourseByCourseId,
});

// Get courses created by a specific user
createRoute(router, {
  method: 'get',
  path: '/api/course/getCoursesByUserId/:userId',
  summary: 'Get courses created by a specific user',
  middlewares: [verifyToken],
  request: {
    params: UserIdParamSchema,
    query: CourseQuerySchema,
  },
  responses: {
    200: CoursesResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: getCoursesByUserId,
});

// Update course by course ID (Educator only)
createRoute(router, {
  method: 'put',
  path: '/api/course/updateCourseByCourseId/:courseId',
  summary: 'Update course by course ID (Educator only)',
  middlewares: [verifyToken],
  request: {
    params: CourseIdParamSchema,
    body: UpdateCourseBodySchema,
  },
  responses: {
    200: CourseSchema,
    400: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: updateCourse,
});

// Delete course by course ID (Educator only)
createRoute(router, {
  method: 'delete',
  path: '/api/course/deleteCourseByCourseId/:courseId',
  summary: 'Delete course by course ID (Educator only)',
  middlewares: [verifyToken],
  request: {
    params: CourseIdParamSchema,
  },
  responses: {
    200: CourseSchema,
    400: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: deleteCourse,
});

export default router;
