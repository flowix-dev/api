import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getExecution, getUserExecutions } from "../controllers/workflow.controller";

const router = Router();

router.get("/", authenticate, getUserExecutions);
router.get("/:executionId", authenticate, getExecution);

export default router;
