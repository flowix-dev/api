import { NodeDefinition } from "../models/NodeDefinition";
import { Workflow } from "../models/Workflow";
import { workflowService } from "../services/workflow.service";

export class WorkflowScheduler {
  private timer: NodeJS.Timeout | null = null;
  private readonly lastRun = new Map<string, number>();
  private readonly tickIntervalMs = 5000;

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      this.tick().catch((error) => {
        console.error("[scheduler] Tick failed:", error);
      });
    }, this.tickIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.lastRun.clear();
  }

  private async tick(): Promise<void> {
    const workflows = await Workflow.find().lean();
    if (workflows.length === 0) {
      return;
    }

    const nodeDefinitionIds = new Set<string>();
    for (const workflow of workflows) {
      for (const node of workflow.nodes) {
        nodeDefinitionIds.add(node.nodeDefinitionId.toString());
      }
    }
    const definitions = await NodeDefinition.find({
      _id: { $in: [...nodeDefinitionIds] },
    });
    const fnKeyByDefinitionId = new Map<string, string>();
    for (const definition of definitions) {
      fnKeyByDefinitionId.set(definition._id.toString(), definition.fnKey);
    }

    const now = Date.now();
    for (const workflow of workflows) {
      for (const node of workflow.nodes) {
        if (fnKeyByDefinitionId.get(node.nodeDefinitionId.toString()) !== "schedule.trigger") {
          continue;
        }
        const intervalSeconds = Number(
          (node.inputs as Record<string, unknown> | undefined)?.intervalSeconds ?? 60
        );
        if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
          continue;
        }
        const key = `${workflow._id.toString()}:${node.id}`;
        const last = this.lastRun.get(key) ?? 0;
        if (now - last < intervalSeconds * 1000) {
          continue;
        }
        this.lastRun.set(key, now);
        workflowService
          .runWorkflow(workflow._id.toString(), workflow.authorId.toString())
          .catch((error) => {
            console.error("[scheduler] Run failed:", error);
          });
      }
    }
  }
}

export const workflowScheduler = new WorkflowScheduler();
