import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";
import { ExecutionContext } from "../execution/ExecutionContext";
import { workflowService } from "../../services/workflow.service";
import { Workflow } from "../../models/Workflow";
import { NodeDefinition } from "../../models/NodeDefinition";
import { IWorkflowExecution } from "../../interfaces/WorkflowExecution";
import { Types } from "mongoose";

export class RunWorkflowExecutor implements INodeExecutor {
  async execute(
    _node: IWorkflowNode,
    inputs: Record<string, unknown>,
    context?: ExecutionContext
  ): Promise<ExecutorResult> {
    const rawWorkflowId = String(inputs.workflowId ?? "").trim();
    if (!rawWorkflowId) {
      throw new Error("workflowId es requerido");
    }
    if (!context?.userId) {
      throw new Error("No se pudo resolver el usuario");
    }

    const childWorkflowId = await this.resolveWorkflowId(rawWorkflowId, context.userId);

    const childInputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (/^input\d+$/.test(key)) {
        childInputs[key] = value;
      }
    }

    const execution = await workflowService.runChildWorkflow(
      childWorkflowId,
      context.userId,
      childInputs,
      {
        uploadedFile: context.uploadedFile ?? undefined,
        puterToken: context.puterToken,
      }
    );

    if (execution.status === "failed") {
      throw new Error(`Workflow hijo falló: ${execution.error ?? "error desconocido"}`);
    }

    const outputs = await readWorkflowOutputs(childWorkflowId, execution);
    return { outputs };
  }

  private async resolveWorkflowId(rawId: string, userId: string): Promise<string> {
    if (Types.ObjectId.isValid(rawId)) {
      const byId = await Workflow.findOne({
        _id: rawId,
        authorId: userId,
      }).lean();
      if (byId) {
        return rawId;
      }
    }

    const byName = await Workflow.findOne({
      name: rawId,
      authorId: userId,
    }).lean();
    if (byName) {
      return byName._id.toString();
    }

    throw new Error(`No se encontró ningún workflow con ID o nombre "${rawId}" para este usuario`);
  }
}

async function readWorkflowOutputs(
  childWorkflowId: string,
  execution: IWorkflowExecution
): Promise<Record<string, unknown>> {
  const childWorkflow = await Workflow.findById(childWorkflowId);
  if (!childWorkflow) {
    return {};
  }

  const definitions = await NodeDefinition.find({
    _id: { $in: childWorkflow.nodes.map((node) => node.nodeDefinitionId) },
  });
  const fnKeyByDefinitionId = new Map<string, string>();
  const nameByDefinitionId = new Map<string, string>();
  for (const definition of definitions) {
    fnKeyByDefinitionId.set(definition._id.toString(), definition.fnKey);
    nameByDefinitionId.set(definition._id.toString(), definition.name);
  }

  const nodeExecutions = execution.nodeExecutions ?? [];
  const nodeOutputs: Record<string, unknown> = {};
  for (const exec of nodeExecutions) {
    if (exec.outputData === undefined || exec.outputData === null) {
      continue;
    }
    const node = childWorkflow.nodes.find((n) => n.id === exec.nodeId);
    const nodeLabel =
      node?.name ||
      nameByDefinitionId.get(node?.nodeDefinitionId?.toString() ?? "") ||
      `node${exec.nodeId}`;
    nodeOutputs[nodeLabel] = exec.outputData;
  }

  const sendOutputs: Record<string, unknown> = {};
  for (const node of childWorkflow.nodes) {
    if (fnKeyByDefinitionId.get(node.nodeDefinitionId.toString()) !== "send.outputs") {
      continue;
    }
    const sendExec = nodeExecutions.find((exec) => exec.nodeId === node.id);
    const sendData = (sendExec?.outputData ?? node.inputs ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(sendData)) {
      if (/^output\d+$/.test(key)) {
        sendOutputs[key] = value;
      }
    }
  }

  const metadata: Record<string, unknown> = {};
  if (execution.outputData !== undefined) {
    metadata._result = execution.outputData;
  }
  if (Object.keys(nodeOutputs).length > 0) {
    metadata._nodeOutputs = nodeOutputs;
  }
  metadata._status = execution.status;

  return {
    ...sendOutputs,
    ...metadata,
  };
}
