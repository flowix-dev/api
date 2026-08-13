import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  updateProfile,
  deleteAccount,
  savePuterToken,
  getPuterUsage,
} from "../controllers/users.controller";

const router = Router();

router.patch("/profile", authenticate, updateProfile);
router.delete("/me", authenticate, deleteAccount);
router.put("/me/puter-token", authenticate, savePuterToken);
router.get("/me/puter-usage", authenticate, getPuterUsage);

export default router;
