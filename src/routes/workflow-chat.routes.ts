import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { workflowChatController } from "../controllers/workflow-chat.controller";

const router = Router();

router.get("/:workflowId", authenticate, (req, res) => workflowChatController.getHistory(req, res));

router.post("/:workflowId/messages", authenticate, (req, res) =>
  workflowChatController.sendMessage(req, res)
);

export default router;
