import { Router } from "express";
import { receiveQuizGrade } from "../controllers/publicController.js";

const router = Router();

// POST /api/v1/public/quiz-grade - Webhook đồng bộ điểm từ Google Forms
router.post("/quiz-grade", receiveQuizGrade);

export default router;
