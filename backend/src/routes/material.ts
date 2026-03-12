import { Router } from 'express';

import {
  addMaterial,
  getMaterialByMaterialId,
  updateMaterialByMaterialId,
  deleteMaterialByMaterialId,
  getMaterialByCourseId,
} from '../controllers/material';
import { verifyToken } from '../middlewares/auth';

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
