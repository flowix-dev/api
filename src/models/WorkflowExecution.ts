import { model, Schema, Types } from "mongoose";
import { IWorkflowExecution, INodeExecution } from "../interfaces/WorkflowExecution";
import { workflowSchema } from "./Workflow";

const NodeExecutionSchema = new Schema<INodeExecution>(
  {
    nodeId: {
      type: Number,
      required: [true, "Node ID is required"],
      min: [0, "Node ID must be a non-negative integer"],
    },
    nodeName: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: [true, "Node execution status is required"],
      enum: ["pending", "running", "completed", "failed", "skipped"],
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      min: [0, "Duration cannot be negative"],
    },
    inputData: {
      type: Schema.Types.Mixed,
    },
    outputData: {
      type: Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
    retryCount: {
      type: Number,
      min: [0, "Retry count cannot be negative"],
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const workflowExecutionSchema = new Schema<IWorkflowExecution>(
  {
    workflowId: {
      type: Types.ObjectId,
      required: [true, "Workflow ID is required"],
      ref: "Workflow",
      index: true,
    },
    triggeredBy: {
      type: Types.ObjectId,
      required: [true, "Triggered by is required"],
      ref: "User",
      index: true,
    },
    triggerType: {
      type: String,
      required: [true, "Trigger type is required"],
      enum: ["manual", "scheduled", "webhook", "child"],
    },
    status: {
      type: String,
      required: [true, "Execution status is required"],
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      index: true,
    },
    startedAt: {
      type: Date,
      required: [true, "Started at is required"],
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      min: [0, "Duration cannot be negative"],
    },
    error: {
      type: String,
    },
    outputData: {
      type: Schema.Types.Mixed,
    },
    nodeExecutions: {
      type: [NodeExecutionSchema],
      default: [],
    },
    workflowSnapshot: {
      type: workflowSchema,
      required: [true, "Workflow snapshot is required"],
    },
  },
  {
    timestamps: true,
  }
);

workflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
workflowExecutionSchema.index({ triggeredBy: 1, createdAt: -1 });
workflowExecutionSchema.index({ createdAt: -1 });

export const WorkflowExecution = model<IWorkflowExecution>(
  "WorkflowExecution",
  workflowExecutionSchema
);
