import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
  runWorkflow,
  getWorkflowExecutions,
} from "../controllers/workflow.controller";

const router = Router();

router.post("/:workflowId/run", authenticate, runWorkflow);
router.get("/:workflowId/executions", authenticate, getWorkflowExecutions);
router.get("/", authenticate, listWorkflows);
router.get("/:workflowId", authenticate, getWorkflow);
router.post("/", authenticate, createWorkflow);
router.patch("/:workflowId", authenticate, updateWorkflow);
router.delete("/:workflowId", authenticate, deleteWorkflow);

export default router;
