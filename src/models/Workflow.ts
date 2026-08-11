import { model, Schema, Types } from "mongoose";
import { IWorkflow } from "../interfaces/Workflow";
import { WorkflowNodeSchema } from "./WorkflowNodeSchema";
import { WorkflowEdgeSchema } from "./WorkflowEdgeSchema";

export const workflowSchema = new Schema<IWorkflow>(
  {
    name: {
      type: String,
      required: [true, "Workflow name is required"],
      trim: true,
    },
    authorId: {
      type: Types.ObjectId,
      required: [true, "Author ID is required"],
      ref: "User",
      index: true,
    },
    nodes: {
      type: [WorkflowNodeSchema],
      default: [],
    },
    edges: {
      type: [WorkflowEdgeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Workflow = model<IWorkflow>("Workflow", workflowSchema);
