import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getAuthUrl,
  oauthCallback,
  getStatus,
  removeCredential,
} from "../controllers/credential.controller";

const router = Router();

router.get("/:provider/auth", authenticate, getAuthUrl);
router.get("/:provider/callback", oauthCallback);
router.get("/:provider", authenticate, getStatus);
router.delete("/:provider", authenticate, removeCredential);

export default router;
