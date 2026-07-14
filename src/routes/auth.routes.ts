import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  register,
  login,
  logout,
  me,
  refresh,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.post("/refresh", refresh);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.patch("/change-password", authenticate, changePassword);

export default router;
