import { Router } from 'express';

import { login, register, getAllStudents } from '../controllers/auth';
import { verifyToken } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';
import { LoginSchema, RegisterSchema } from '../validation/schemas';

const router = Router();

router.post('/register', validateBody(RegisterSchema), register);
router.post('/login', validateBody(LoginSchema), login);
router.get('/user/getAllStudents', verifyToken, getAllStudents);

export default router;
