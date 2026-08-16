import { Router } from "express";
import { workflowService } from "../services/workflow.service";

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

export default router;
