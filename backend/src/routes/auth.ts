import { Router } from 'express';
import {
  addCourse,
  deleteCourse,
  getAllCourses,
  getCourseByCourseId,
  getCoursesByUserId,
  updateCourse,
} from '../controller/courseControllers';
import { login, register, getAllStudents } from '../controller/userControllers';
import {
  addMaterial,
  getMaterialByMaterialId,
  updateMaterialByMaterialId,
  deleteMaterialByMaterialId,
  getMaterialBycourseId,
} from '../controller/materialControllers';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/user/getAllStudents', verifyToken, getAllStudents);
router.post('/course/addCourse', verifyToken, addCourse);
router.get('/course/getAllCourses', verifyToken, getAllCourses);
router.get('/course/getCourseByCourseId/:courseId', getCourseByCourseId);
router.get('/course/getCoursesByUserId/:userId', getCoursesByUserId);
router.put(
  '/course/updateCourseByCourseId/:courseId',
  verifyToken,
  updateCourse
);
router.delete(
  '/course/deleteCourseByCourseId/:courseId',
  verifyToken,
  deleteCourse
);
router.post('/material/addMaterial', verifyToken, addMaterial);
router.get(
  '/material/getMaterialByMaterialId/:materialId',
  verifyToken,
  getMaterialByMaterialId
);
router.put(
  '/material/updateMaterialByMaterialId/:materialId',
  verifyToken,
  updateMaterialByMaterialId
);
router.delete(
  '/material/deleteMaterialByMaterialId/:materialId',
  verifyToken,
  deleteMaterialByMaterialId
);
router.get(
  '/material/getMaterialByCourseId/:courseId',
  verifyToken,
  getMaterialBycourseId
);

export default router;
