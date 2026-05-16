import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// POST /api/v1/auth/register
router.post("/register", register);

// POST /api/v1/auth/login  → sets HttpOnly cookie
router.post("/login", login);

// POST /api/v1/auth/logout → clears HttpOnly cookie
router.post("/logout", logout);

// GET  /api/v1/auth/me     → protected: requires valid cookie/token
router.get("/me", authMiddleware, getMe);

export default router;
