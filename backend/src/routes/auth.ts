import { Router } from 'express';

import { login, register, getAllStudents } from '../controllers/auth';
import { createRoute } from '../lib/createRoute';
import { verifyToken } from '../middlewares/auth';
import {
  ErrorResponseSchema,
  LoginResponseSchema,
  LoginSchema,
  RegisterResponseSchema,
  RegisterSchema,
  StudentsQuerySchema,
  StudentsResponseSchema,
} from '../validation/schemas';

const router = Router();

// Register user
createRoute(router, {
  method: 'post',
  path: '/api/auth/register',
  summary: 'Register user',
  request: {
    body: RegisterSchema,
  },
  responses: {
    201: RegisterResponseSchema,
    400: ErrorResponseSchema,
  },
  handler: register,
});

// Login user
createRoute(router, {
  method: 'post',
  path: '/api/auth/login',
  summary: 'Login user',
  request: {
    body: LoginSchema,
  },
  responses: {
    200: LoginResponseSchema,
    400: ErrorResponseSchema,
    401: ErrorResponseSchema,
  },
  handler: login,
});

// Get all students (Educator only)
createRoute(router, {
  method: 'get',
  path: '/api/auth/user/getAllStudents',
  summary: 'Get all students (Educator only)',
  middlewares: [verifyToken],
  request: {
    query: StudentsQuerySchema,
  },
  responses: {
    200: StudentsResponseSchema,
    400: ErrorResponseSchema,
  },
  handler: getAllStudents,
});

export default router;
