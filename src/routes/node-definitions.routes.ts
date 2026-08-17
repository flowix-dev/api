import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { NodeDefinition } from "../models/NodeDefinition";

const router = Router();

router.get("/", authenticate, async (_req, res) => {
  try {
    const definitions = await NodeDefinition.find().sort({ category: 1, name: 1 });
    res.json({ definitions });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to list node definitions";
    res.status(500).json({ message: msg });
  }
});

router.get("/public-tools", authenticate, async (_req, res) => {
  try {
    const tools = await NodeDefinition.find({
      publicTool: true,
      scope: { $in: ["chat", "all"] },
    })
      .sort({ category: 1, name: 1 })
      .lean();
    res.json({ tools });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to list public tools";
    res.status(500).json({ message: msg });
  }
});

export default router;
