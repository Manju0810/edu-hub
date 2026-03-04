import { Router } from "express";
import { register } from "../controller/auth";

const router = Router()

router.post("/register", register)

export default router