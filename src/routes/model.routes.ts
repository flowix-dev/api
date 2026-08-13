import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { MODEL_CATALOG } from "../chat/models";

const router = Router();

router.get("/", authenticate, (_req, res) => {
  res.json({ models: MODEL_CATALOG });
});

export default router;
