import { Router } from 'express';
import { login, register, getAllStudents } from '../controller/auth';
import { verifyToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { RegisterSchema } from '../validation/schemas';

const router = Router();

router.post('/register', validateBody(RegisterSchema), register);
router.post('/login', login);
router.get('/user/getAllStudents', verifyToken, getAllStudents);

export default router;
