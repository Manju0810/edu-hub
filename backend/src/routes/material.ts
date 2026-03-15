import { Router } from 'express';

import {
  addMaterial,
  getMaterialByMaterialId,
  updateMaterialByMaterialId,
  deleteMaterialByMaterialId,
  getMaterialByCourseId,
} from '../controllers/material';
import { createRoute } from '../lib/createRoute';
import { verifyToken } from '../middlewares/auth';
import {
  CourseIdParamSchema,
  ErrorResponseSchema,
  MaterialBodySchema,
  MaterialIdParamSchema,
  MaterialSchema,
  MaterialsResponseSchema,
  UpdateMaterialBodySchema,
} from '../validation/schemas';

const router = Router();

// Add new material (Non-student users only)
createRoute(router, {
  method: 'post',
  path: '/api/material/addMaterial',
  summary: 'Add new material (Non-student users only)',
  middlewares: [verifyToken],
  request: {
    body: MaterialBodySchema,
  },
  responses: {
    200: MaterialSchema,
    400: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: addMaterial,
});

// Get material by material ID (Non-student users only)
createRoute(router, {
  method: 'get',
  path: '/api/material/getMaterialByMaterialId/:materialId',
  summary: 'Get material by material ID (Non-student users only)',
  middlewares: [verifyToken],
  request: {
    params: MaterialIdParamSchema,
  },
  responses: {
    200: MaterialSchema,
    404: ErrorResponseSchema,
  },
  handler: getMaterialByMaterialId,
});

// Update material by material ID (Non-student users only)
createRoute(router, {
  method: 'put',
  path: '/api/material/updateMaterialByMaterialId/:materialId',
  summary: 'Update material by material ID (Non-student users only)',
  middlewares: [verifyToken],
  request: {
    params: MaterialIdParamSchema,
    body: UpdateMaterialBodySchema,
  },
  responses: {
    200: MaterialSchema,
    400: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: updateMaterialByMaterialId,
});

// Delete material by material ID (Non-student users only)
createRoute(router, {
  method: 'delete',
  path: '/api/material/deleteMaterialByMaterialId/:materialId',
  summary: 'Delete material by material ID (Non-student users only)',
  middlewares: [verifyToken],
  request: {
    params: MaterialIdParamSchema,
  },
  responses: {
    200: MaterialSchema,
    400: ErrorResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: deleteMaterialByMaterialId,
});

// Get all materials for a specific course (Non-student users only)
createRoute(router, {
  method: 'get',
  path: '/api/material/getMaterialByCourseId/:courseId',
  summary: 'Get all materials for a specific course (Non-student users only)',
  middlewares: [verifyToken],
  request: {
    params: CourseIdParamSchema,
  },
  responses: {
    200: MaterialsResponseSchema,
    404: ErrorResponseSchema,
  },
  handler: getMaterialByCourseId,
});

export default router;
