import { IWorkflow } from "../../interfaces/Workflow";
import { INodeExecution, IWorkflowExecution } from "../../interfaces/WorkflowExecution";
import { WorkflowExecution } from "../../models/WorkflowExecution";
import { Workflow } from "../../models/Workflow";
import { ExecutionContext, UploadedFile } from "./ExecutionContext";
import { DependencyGraph } from "./DependencyGraph";
import { NodeExecutor } from "./NodeExecutor";
import { InputResolver } from "./InputResolver";
import { WorkflowEventEmitter, IWorkflowEventEmitter } from "./WorkflowEventEmitter";

export interface RunOptions {
  maxConcurrentNodes?: number;
  uploadedFile?: UploadedFile | null;
  puterToken?: string | null;
}

const DEFAULT_OPTIONS: Required<RunOptions> = {
  maxConcurrentNodes: 10,
  uploadedFile: null,
  puterToken: null,
};

export class WorkflowRunner {
  private readonly eventEmitter: IWorkflowEventEmitter = new WorkflowEventEmitter();
  private readonly inputResolver = new InputResolver();
  private readonly nodeExecutor = new NodeExecutor(this.inputResolver, this.eventEmitter);

  get events(): IWorkflowEventEmitter {
    return this.eventEmitter;
  }

  async runWorkflow(
    workflowId: string,
    triggeredBy: string,
    options: RunOptions = {}
  ): Promise<IWorkflowExecution> {
    const opts: Required<RunOptions> = { ...DEFAULT_OPTIONS, ...options };

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const execution = await WorkflowExecution.create({
      workflowId: workflow._id,
      triggeredBy,
      triggerType: "manual",
      status: "running",
      startedAt: new Date(),
      workflowSnapshot: {
        name: workflow.name,
        authorId: workflow.authorId,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
      nodeExecutions: [],
    });

    const executionId = execution._id.toString();

    this.eventEmitter.emit("workflow.started", {
      executionId,
      workflowId,
    });

    this.executeAsync(workflow, execution, opts).catch((error) => {
      console.error(`Workflow execution ${executionId} failed:`, error);
    });

    return execution;
  }

  private async persistResolvedInputs(
    workflowId: string,
    nodeExecutions: INodeExecution[]
  ): Promise<void> {
    const inputsById = new Map<number, Record<string, unknown>>();
    for (const nodeExec of nodeExecutions) {
      if (nodeExec.inputData) {
        inputsById.set(nodeExec.nodeId, nodeExec.inputData as Record<string, unknown>);
      }
    }
    if (inputsById.size === 0) {
      return;
    }

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return;
    }
    const nodes = workflow.nodes.map((node) =>
      inputsById.has(node.id) ? { ...node, inputs: inputsById.get(node.id)! } : node
    );
    workflow.nodes = nodes as typeof workflow.nodes;
    await workflow.save();
  }

  private async executeAsync(
    workflow: IWorkflow,
    execution: IWorkflowExecution,
    opts: Required<RunOptions>
  ): Promise<void> {
    const executionId = execution._id.toString();
    const context = new ExecutionContext();
    context.workflowId = execution.workflowId.toString();
    context.userId = execution.triggeredBy.toString();
    context.uploadedFile = opts.uploadedFile ?? null;
    context.puterToken = opts.puterToken ?? null;
    const graph = new DependencyGraph(workflow.nodes, workflow.edges);
    const nodeExecutions: INodeExecution[] = [];
    const semaphore = createSemaphore(opts.maxConcurrentNodes);

    try {
      const queue: number[] = [...graph.entryNodeIds];
      const processed = new Set<number>();

      while (queue.length > 0) {
        const batch = queue.splice(0);

        await Promise.all(
          batch.map(async (nodeId) => {
            if (processed.has(nodeId)) return;
            processed.add(nodeId);

            await semaphore.acquire();
            try {
              const graphNode = graph.getNode(nodeId);
              if (!graphNode) return;

              const nodeExec = await this.nodeExecutor.executeNode(graphNode, context, executionId);
              nodeExecutions.push(nodeExec);
              WorkflowExecution.findByIdAndUpdate(executionId, {
                $set: { nodeExecutions: [...nodeExecutions] },
              }).catch(() => {});

              if (nodeExec.status === "completed" || nodeExec.status === "skipped") {
                for (const edge of graphNode.outgoingEdges) {
                  const child = graph.getNode(edge.targetNodeId);
                  if (child) {
                    child.remainingDependencies--;
                    if (child.remainingDependencies <= 0 && !processed.has(edge.targetNodeId)) {
                      queue.push(edge.targetNodeId);
                    }
                  }
                }
              }
            } finally {
              semaphore.release();
            }
          })
        );
      }

      const finalStatus = context.failed.size > 0 ? "failed" : "completed";
      const completedAt = new Date();
      const duration = completedAt.getTime() - execution.startedAt.getTime();

      await this.persistResolvedInputs(execution.workflowId.toString(), nodeExecutions);

      await WorkflowExecution.findByIdAndUpdate(executionId, {
        $set: {
          status: finalStatus,
          completedAt,
          duration,
          error: finalStatus === "failed" ? "One or more nodes failed" : undefined,
          nodeExecutions,
        },
      });

      if (finalStatus === "completed") {
        this.eventEmitter.emit("workflow.completed", {
          executionId,
          duration,
        });
      } else {
        this.eventEmitter.emit("workflow.failed", {
          executionId,
          duration,
          error: "One or more nodes failed",
        });
      }
    } catch (error) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - execution.startedAt.getTime();
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await WorkflowExecution.findByIdAndUpdate(executionId, {
        $set: {
          status: "failed",
          completedAt,
          duration,
          error: errorMessage,
          nodeExecutions,
        },
      });

      this.eventEmitter.emit("workflow.failed", {
        executionId,
        duration,
        error: errorMessage,
      });
    }
  }
}

function createSemaphore(limit: number) {
  let available = limit;
  const queue: Array<() => void> = [];

  return {
    acquire(): Promise<void> {
      if (available > 0) {
        available--;
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        queue.push(resolve);
      });
    },
    release(): void {
      const next = queue.shift();
      if (next) {
        next();
      } else {
        available++;
      }
    },
  };
}
