import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { updateProfile, deleteAccount } from "../controllers/users.controller";

const router = Router();

router.patch("/profile", authenticate, updateProfile);
router.delete("/me", authenticate, deleteAccount);

export default router;
