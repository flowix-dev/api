import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
  runWorkflow,
  downloadFile,
  getWorkflowExecutions,
  cancelExecution,
} from "../controllers/workflow.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post("/:workflowId/run", authenticate, upload.single("file"), runWorkflow);
router.post("/executions/:executionId/cancel", authenticate, cancelExecution);
router.get("/files/*key", authenticate, downloadFile);
router.get("/:workflowId/executions", authenticate, getWorkflowExecutions);
router.get("/", authenticate, listWorkflows);
router.get("/:workflowId", authenticate, getWorkflow);
router.post("/", authenticate, createWorkflow);
router.patch("/:workflowId", authenticate, updateWorkflow);
router.delete("/:workflowId", authenticate, deleteWorkflow);

export default router;
