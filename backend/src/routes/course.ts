import { Router } from "express";
import { addCourse, deleteCourse, getAllCourses,getCourseByCourseId, getCoursesByUserId, updateCourse } from "../controller/course";
import { verifyToken } from "../middleware/auth";

const router = Router()

router.post("/addCourse", verifyToken, addCourse)
router.get("/getAllCourses", verifyToken, getAllCourses)
router.get("/getCourseByCourseId/:courseId", getCourseByCourseId)
router.get("/getCoursesByUserId/:userId", getCoursesByUserId)
router.put("/updateCourseByCourseId/:courseId", verifyToken, updateCourse)
router.delete("/deleteCourseByCourseId/:courseId", verifyToken, deleteCourse)

export default router