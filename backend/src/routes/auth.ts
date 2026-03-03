import { Router } from "express";
import { register } from "../controller/auth";
import { verifyToken } from "../middleware/auth";

const router = Router()
router.post("/register", verifyToken, register)

export default router