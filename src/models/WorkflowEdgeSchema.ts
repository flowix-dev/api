import { Schema } from "mongoose";
import { IWorkflowEdge } from "../interfaces/WorkflowEdge";

export const WorkflowEdgeSchema = new Schema<IWorkflowEdge>(
  {
    sourceNodeId: {
      type: Number,
      required: [true, "Source node ID is required"],
      min: [0, "Source node ID must be a non-negative integer"],
    },
    sourceKey: {
      type: String,
      required: [true, "Source key is required"],
      trim: true,
    },
    targetNodeId: {
      type: Number,
      required: [true, "Target node ID is required"],
      min: [0, "Target node ID must be a non-negative integer"],
    },
    targetKey: {
      type: String,
      required: [true, "Target key is required"],
      trim: true,
    },
  },
  {
    _id: false,
  }
);
