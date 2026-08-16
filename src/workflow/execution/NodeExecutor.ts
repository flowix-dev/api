import { INodeExecution } from "../../interfaces/WorkflowExecution";
import { NodeDefinition } from "../../models/NodeDefinition";
import { executorRegistry, ExecutorResult, INodeExecutor } from "../executors/registry";
import { InputResolver } from "./InputResolver";
import { ExecutionContext } from "./ExecutionContext";
import { GraphNode } from "./DependencyGraph";
import { IWorkflowEventEmitter } from "./WorkflowEventEmitter";
import { prepareArrayInputs, buildBatchPlan, aggregateBatchedOutputs } from "./ArrayBatch";

export class NodeExecutor {
  constructor(
    private readonly inputResolver: InputResolver,
    private readonly eventEmitter: IWorkflowEventEmitter
  ) {}

  async executeNode(
    graphNode: GraphNode,
    context: ExecutionContext,
    executionId: string
  ): Promise<INodeExecution> {
    const { node } = graphNode;
    const nodeExecution: INodeExecution = {
      nodeId: node.id,
      nodeName: node.name,
      status: "pending",
    };

    try {
      if (node.disabled) {
        nodeExecution.status = "skipped";
        context.markSkipped(node.id);
        this.eventEmitter.emit("node.skipped", {
          executionId,
          nodeId: node.id,
          nodeName: node.name,
        });
        return nodeExecution;
      }

      nodeExecution.status = "running";
      nodeExecution.startedAt = new Date();
      context.markRunning(node.id);

      this.eventEmitter.emit("node.started", {
        executionId,
        nodeId: node.id,
        nodeName: node.name,
        startedAt: nodeExecution.startedAt,
      });

      const resolvedInputs = this.inputResolver.resolve(
        node.inputs as Record<string, unknown>,
        graphNode.incomingEdges,
        context
      );

      const definition = await NodeDefinition.findById(node.nodeDefinitionId);
      if (!definition) {
        throw new Error(`NodeDefinition not found for id: ${node.nodeDefinitionId}`);
      }
      const executor: INodeExecutor = executorRegistry.getExecutor(definition.fnKey);

      const preparedInputs = prepareArrayInputs(resolvedInputs, definition.inputs);
      nodeExecution.inputData = preparedInputs;

      let result: ExecutorResult;
      if (executor.batchMode === "never") {
        result = await executor.execute(node, preparedInputs, context);
      } else {
        const plan = buildBatchPlan(preparedInputs, definition.inputs);
        if (!plan.batched) {
          result = await executor.execute(node, preparedInputs, context);
        } else {
          const perInstanceOutputs: Array<Record<string, unknown>> = [];
          for (const instance of plan.instances) {
            const instanceResult = await executor.execute(node, instance, context);
            perInstanceOutputs.push(instanceResult.outputs);
          }
          result = { outputs: aggregateBatchedOutputs(perInstanceOutputs) };
        }
      }

      if (result.skipEdges && result.skipEdges.length > 0) {
        context.setInactiveOutputs(node.id, result.skipEdges);
      }

      context.setOutput(node.id, result.outputs);
      nodeExecution.outputData = result.outputs;
      nodeExecution.status = "completed";
      nodeExecution.completedAt = new Date();
      nodeExecution.duration =
        nodeExecution.completedAt.getTime() - nodeExecution.startedAt!.getTime();

      context.markExecuted(node.id);

      this.eventEmitter.emit("node.completed", {
        executionId,
        nodeId: node.id,
        nodeName: node.name,
        duration: nodeExecution.duration,
      });
    } catch (error) {
      nodeExecution.status = "failed";
      nodeExecution.completedAt = new Date();
      nodeExecution.error = error instanceof Error ? error.message : "Unknown error";
      if (nodeExecution.startedAt) {
        nodeExecution.duration =
          nodeExecution.completedAt.getTime() - nodeExecution.startedAt.getTime();
      }
      context.markFailed(node.id);

      this.eventEmitter.emit("node.failed", {
        executionId,
        nodeId: node.id,
        nodeName: node.name,
        error: nodeExecution.error,
      });
    }

    return nodeExecution;
  }
}
