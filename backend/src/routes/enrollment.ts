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
import { verifyToken } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import { AddEnrollSchema, UpdateEnrollSchema } from '../validation/schemas';

const router = Router();

router.get('/getAllEnrolls', verifyToken, getAllEnrolls);
router.post(
  '/addEnroll',
  verifyToken,
  validateBody(AddEnrollSchema),
  addEnroll
);
router.get('/getEnrollByEnrollId/:enrollId', getEnrollByEnrollId);
router.get('/getEnrollsByUserId/:userId', verifyToken, getEnrollsByUserId);
router.get(
  '/getEnrollsByCourseId/:courseId',
  verifyToken,
  getEnrollsByCourseId
);
router.put(
  '/updateEnrollByEnrollID/:enrollId',
  verifyToken,
  validateBody(UpdateEnrollSchema),
  updateEnrollByEnrollId
);
router.delete(
  '/deleteEnrollByEnrollID/:enrollId',
  verifyToken,
  deleteEnrollByEnrollId
);

export default router;
