import { Types } from "mongoose";
import { ExecutionStatus, NodeExecutionStatus, TriggerType } from "../types/ExecutionStatus";
import { IWorkflow } from "./Workflow";

export interface INodeExecution {
  nodeId: number;
  nodeName?: string;
  status: NodeExecutionStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  inputData?: unknown;
  outputData?: unknown;
  error?: string;
  retryCount?: number;
}

export interface IWorkflowExecution {
  _id: Types.ObjectId;
  workflowId: Types.ObjectId;
  triggeredBy: Types.ObjectId;
  triggerType: TriggerType;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  outputData?: unknown;
  nodeExecutions: INodeExecution[];
  workflowSnapshot: Pick<IWorkflow, "name" | "authorId" | "nodes" | "edges">;
  createdAt: Date;
  updatedAt: Date;
}
