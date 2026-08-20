import { Router } from "express";
import { workflowService } from "../services/workflow.service";
import { resolveWebhookWait } from "../workflow/executors/webhook-wait.executor";
import { verifyWebhookSignature } from "../middleware/webhook-auth";

const router = Router();

router.get("/whatsapp", async (req, res) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

router.post("/whatsapp", async (req, res) => {
  try {
    const body = req.body;
    if (body.object === "whatsapp_business_account") {
      const { Workflow } = await import("../models/Workflow");
      const { NodeDefinition } = await import("../models/NodeDefinition");
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value as Record<string, unknown> | undefined;
      const metadata = value?.metadata as Record<string, unknown> | undefined;
      const incomingPhoneId = (metadata?.phone_number_id as string) ?? "";

      const defs = await NodeDefinition.find({ fnKey: "whatsapp.trigger" }).lean();
      const ids = defs.map((d) => d._id.toString());
      const workflows = await Workflow.find({
        "nodes.nodeDefinitionId": { $in: ids },
      }).lean();
      for (const wf of workflows) {
        const node = wf.nodes.find((n) => ids.includes(n.nodeDefinitionId.toString()));
        const phoneId = (node?.inputs as Record<string, unknown> | undefined)?.phoneNumberId as
          string | undefined;
        if (phoneId && incomingPhoneId && phoneId !== incomingPhoneId) continue;
        workflowService.runWebhookWorkflow(wf._id.toString(), body).catch(() => {});
      }
    }
    res.sendStatus(200);
  } catch {
    res.sendStatus(200);
  }
});

router.post("/:workflowId", verifyWebhookSignature, async (req, res) => {
  try {
    const body = req.body;
    const workflowId = req.params.workflowId as string;

    if (body.type === "url_verification" && body.challenge) {
      res.status(200).json({ challenge: body.challenge });
      return;
    }

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      if (changes?.field === "messages") {
        const execution = await workflowService.runWebhookWorkflow(workflowId, body);
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

    const execution = await workflowService.runWebhookWorkflow(workflowId, body);
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
