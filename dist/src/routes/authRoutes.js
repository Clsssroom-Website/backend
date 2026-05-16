import { Router } from "express";
import { register, login, refreshToken, logout } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = Router();
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", authMiddleware, logout);
export default router;
