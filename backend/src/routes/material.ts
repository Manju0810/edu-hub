import { Router } from 'express';

import {
  addMaterial,
  getMaterialByMaterialId,
  updateMaterialByMaterialId,
  deleteMaterialByMaterialId,
  getMaterialByCourseId,
} from '../controller/material';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/addMaterial', verifyToken, addMaterial);
router.get(
  '/getMaterialByMaterialId/:materialId',
  verifyToken,
  getMaterialByMaterialId
);
router.put(
  '/updateMaterialByMaterialId/:materialId',
  verifyToken,
  updateMaterialByMaterialId
);
router.delete(
  '/deleteMaterialByMaterialId/:materialId',
  verifyToken,
  deleteMaterialByMaterialId
);
router.get(
  '/getMaterialByCourseId/:courseId',
  verifyToken,
  getMaterialByCourseId
);

export default router;
