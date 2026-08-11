import { Schema, Types } from "mongoose";
import { IWorkflowNode } from "../interfaces/WorkflowNode";

export const WorkflowNodeSchema = new Schema<IWorkflowNode>(
  {
    id: {
      type: Number,
      required: [true, "Node id is required"],
      min: [0, "Node id must be a non-negative integer"],
    },
    nodeDefinitionId: {
      type: Types.ObjectId,
      required: [true, "Node definition ID is required"],
      ref: "NodeDefinition",
    },
    name: {
      type: String,
      trim: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    x: {
      type: Number,
      required: [true, "X position is required"],
    },
    y: {
      type: Number,
      required: [true, "Y position is required"],
    },
    w: {
      type: Number,
      required: [true, "Width is required"],
    },
    h: {
      type: Number,
      required: [true, "Height is required"],
    },
    inputs: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  }
);
