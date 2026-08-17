import { Router } from "express";
import { workflowService } from "../services/workflow.service";
import { resolveWebhookWait } from "../workflow/executors/webhook-wait.executor";

const router = Router();

router.post("/:workflowId", async (req, res) => {
  try {
    const body = req.body;

    if (body.type === "url_verification" && body.challenge) {
      res.status(200).json({ challenge: body.challenge });
      return;
    }

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      if (changes?.field === "messages") {
        const execution = await workflowService.runWebhookWorkflow(req.params.workflowId, body);
        res.status(202).json({
          message: "Workflow execution started",
          execution: {
            _id: execution._id,
            status: execution.status,
          },
        });
        return;
      }
    }

    const execution = await workflowService.runWebhookWorkflow(req.params.workflowId, body);
    res.status(202).json({
      message: "Workflow execution started",
      execution: {
        _id: execution._id,
        status: execution.status,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to run workflow";
    res.status(400).json({ message });
  }
});

router.post("/:executionId/:nodeId/wait", async (req, res) => {
  try {
    const { executionId, nodeId } = req.params;
    const resolved = resolveWebhookWait(executionId, Number(nodeId), req.body);

    if (!resolved) {
      res.status(404).json({ message: "No pending webhook wait found" });
      return;
    }

    res.status(200).json({ message: "Event received" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve webhook";
    res.status(400).json({ message });
  }
});

export default router;
