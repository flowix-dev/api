import { IWorkflow } from "../../interfaces/Workflow";
import { IWorkflowEdge } from "../../interfaces/WorkflowEdge";
import { INodeExecution, IWorkflowExecution } from "../../interfaces/WorkflowExecution";
import { WorkflowExecution } from "../../models/WorkflowExecution";
import { Workflow } from "../../models/Workflow";
import { NodeDefinition } from "../../models/NodeDefinition";
import { ExecutionContext, UploadedFile } from "./ExecutionContext";
import { DependencyGraph } from "./DependencyGraph";
import { NodeExecutor } from "./NodeExecutor";
import { InputResolver } from "./InputResolver";
import { WorkflowEventEmitter, IWorkflowEventEmitter } from "./WorkflowEventEmitter";

export interface RunOptions {
  maxConcurrentNodes?: number;
  uploadedFile?: UploadedFile | null;
  puterToken?: string | null;
  triggerData?: unknown;
  childInputs?: Record<string, unknown> | null;
}

const DEFAULT_OPTIONS: Required<RunOptions> = {
  maxConcurrentNodes: 10,
  uploadedFile: null,
  puterToken: null,
  triggerData: null,
  childInputs: null,
};

export class WorkflowRunner {
  private readonly eventEmitter: IWorkflowEventEmitter = new WorkflowEventEmitter();
  private readonly inputResolver = new InputResolver();
  private readonly nodeExecutor = new NodeExecutor(this.inputResolver, this.eventEmitter);
  private readonly runningContexts = new Map<string, ExecutionContext>();

  get events(): IWorkflowEventEmitter {
    return this.eventEmitter;
  }

  cancelExecution(executionId: string): boolean {
    const context = this.runningContexts.get(executionId);
    if (!context) {
      return false;
    }
    context.halt();
    return true;
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

  async runWorkflowAndWait(
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
      triggerType: "child",
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

    this.eventEmitter.emit("workflow.started", {
      executionId: execution._id.toString(),
      workflowId,
    });

    await this.executeAsync(workflow, execution, opts);

    const refreshed = await WorkflowExecution.findById(execution._id);
    if (!refreshed) {
      throw new Error(`Execution not found: ${execution._id}`);
    }
    return refreshed;
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
    context.triggerData = opts.triggerData ?? null;
    context.childInputs = opts.childInputs ?? null;
    this.runningContexts.set(executionId, context);

    const graph = new DependencyGraph(workflow.nodes, workflow.edges);
    const nodeExecutions: INodeExecution[] = [];
    const semaphore = createSemaphore(opts.maxConcurrentNodes);

    const definitions = await NodeDefinition.find({
      _id: { $in: workflow.nodes.map((node) => node.nodeDefinitionId) },
    });
    const activationModeByNode = new Map<number, "all" | "any">();
    const fnKeyByNode = new Map<number, string>();
    for (const node of workflow.nodes) {
      const definition = definitions.find(
        (def) => def._id.toString() === node.nodeDefinitionId.toString()
      );
      activationModeByNode.set(node.id, definition?.activationMode === "any" ? "any" : "all");
      fnKeyByNode.set(node.id, definition?.fnKey ?? "");
    }

    const protectorIdByNode = new Map<number, number>();
    for (const node of workflow.nodes) {
      if (fnKeyByNode.get(node.id) !== "try.catch") {
        continue;
      }
      const graphNode = graph.getNode(node.id);
      if (!graphNode) {
        continue;
      }
      const tryStart = new Set<number>();
      const catchStart = new Set<number>();
      for (const edge of graphNode.outgoingEdges) {
        if (edge.sourceKey === "try") {
          tryStart.add(edge.targetNodeId);
        } else if (edge.sourceKey === "catch") {
          catchStart.add(edge.targetNodeId);
        }
      }
      const tryReachable = new Set<number>();
      for (const startId of tryStart) {
        tryReachable.add(startId);
        for (const reachableId of reachableAll(graph, startId)) {
          tryReachable.add(reachableId);
        }
      }
      const catchReachable = new Set<number>();
      for (const startId of catchStart) {
        catchReachable.add(startId);
        for (const reachableId of reachableAll(graph, startId)) {
          catchReachable.add(reachableId);
        }
      }
      for (const protectedId of tryReachable) {
        if (catchReachable.has(protectedId)) {
          continue;
        }
        protectorIdByNode.set(protectedId, node.id);
      }
    }

    try {
      const queue: number[] = [...graph.entryNodeIds];
      const processed = new Set<number>();
      const queued = new Set<number>();
      const abortedProtectors = new Set<number>();

      const enqueue = (nodeId: number) => {
        if (processed.has(nodeId) || queued.has(nodeId)) {
          return;
        }
        queued.add(nodeId);
        queue.push(nodeId);
      };

      const activateEdge = (edge: IWorkflowEdge) => {
        const child = graph.getNode(edge.targetNodeId);
        if (!child) {
          return;
        }
        if (activationModeByNode.get(edge.targetNodeId) === "any") {
          child.remainingDependencies = 0;
          enqueue(edge.targetNodeId);
        } else {
          child.remainingDependencies--;
          if (child.remainingDependencies <= 0) {
            enqueue(edge.targetNodeId);
          }
        }
      };

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

              const protectorId = protectorIdByNode.get(nodeId);
              if (protectorId !== undefined && abortedProtectors.has(protectorId)) {
                nodeExecutions.push({
                  nodeId,
                  nodeName: graphNode.node.name,
                  status: "skipped",
                });
                return;
              }

              const nodeExec = await this.nodeExecutor.executeNode(graphNode, context, executionId);
              nodeExecutions.push(nodeExec);
              WorkflowExecution.findByIdAndUpdate(executionId, {
                $set: { nodeExecutions: [...nodeExecutions] },
              }).catch(() => {});

              if (nodeExec.status === "completed" || nodeExec.status === "skipped") {
                for (const edge of graphNode.outgoingEdges) {
                  if (context.isOutputInactive(nodeId, edge.sourceKey)) {
                    continue;
                  }
                  activateEdge(edge);
                }
              } else if (nodeExec.status === "failed" && protectorId !== undefined) {
                abortedProtectors.add(protectorId);
                context.markCaught(nodeId);
                const protectorGraphNode = graph.getNode(protectorId);
                if (protectorGraphNode) {
                  const currentOutputs = context.outputs.get(protectorId) ?? {};
                  context.setOutput(protectorId, {
                    ...currentOutputs,
                    catch: nodeExec.error ?? "Unknown error",
                  });
                  for (const edge of protectorGraphNode.outgoingEdges) {
                    if (edge.sourceKey === "catch") {
                      activateEdge(edge);
                    }
                  }
                }
              }
            } finally {
              semaphore.release();
            }
          })
        );

        if (context.isHalted) {
          break;
        }
      }

      let finalStatus: string = "completed";
      for (const failedId of context.failed) {
        if (!context.isCaught(failedId)) {
          finalStatus = "failed";
          break;
        }
      }
      const completedAt = new Date();
      const duration = completedAt.getTime() - execution.startedAt.getTime();

      await this.persistResolvedInputs(execution.workflowId.toString(), nodeExecutions);

      const hasHaltValue = context.isHalted && context.haltValue !== undefined;
      await WorkflowExecution.findByIdAndUpdate(executionId, {
        $set: {
          status: finalStatus,
          completedAt,
          duration,
          error: finalStatus === "failed" ? "One or more nodes failed" : undefined,
          nodeExecutions,
          ...(hasHaltValue ? { outputData: context.haltValue } : {}),
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
    } finally {
      this.runningContexts.delete(executionId);
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

function reachableAll(graph: DependencyGraph, startId: number): Set<number> {
  const result = new Set<number>();
  const visited = new Set<number>([startId]);
  const stack = [startId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    const graphNode = graph.getNode(currentId);
    if (!graphNode) {
      continue;
    }
    for (const edge of graphNode.outgoingEdges) {
      if (visited.has(edge.targetNodeId)) {
        continue;
      }
      visited.add(edge.targetNodeId);
      result.add(edge.targetNodeId);
      stack.push(edge.targetNodeId);
    }
  }

  return result;
}
