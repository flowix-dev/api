import { model, Schema } from "mongoose";
import { INodeDefinition } from "../interfaces/NodeDefinition";
import { NodePortSchema } from "./NodePortSchema";

const nodeDefinitionSchema = new Schema<INodeDefinition>(
  {
    name: {
      type: String,
      required: [true, "Node definition name is required"],
      trim: true,
    },
    fnKey: {
      type: String,
      required: [true, "fnKey is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
      min: [1, "Version must be at least 1"],
    },
    scope: {
      type: String,
      enum: {
        values: ["workflow", "chat", "all"],
        message: "Invalid scope: {VALUE}",
      },
      default: "all",
    },
    publicTool: {
      type: Boolean,
      default: false,
    },
    activationMode: {
      type: String,
      enum: {
        values: ["all", "any"],
        message: "Invalid activationMode: {VALUE}",
      },
      default: "all",
    },
    inputs: {
      type: [NodePortSchema],
      default: [],
    },
    outputs: {
      type: [NodePortSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const NodeDefinition = model<INodeDefinition>("NodeDefinition", nodeDefinitionSchema);
