import { Router } from "express";
import { getAllStudents, login, register } from "../controller/auth";
import { verifyToken } from "../middleware/auth";

const router = Router()

router.post("/register", register)
router.post("/login", login)
router.get("/user/getAllStudents", verifyToken, getAllStudents)

export default router