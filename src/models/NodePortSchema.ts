import { Schema } from "mongoose";
import { NodeDataType } from "../types/NodeDataType";
import { NodeInputKindValues } from "../types/NodeInputKind";
import { INodePort } from "../interfaces/NodePort";

export const NodePortSchema = new Schema<INodePort>(
  {
    key: {
      type: String,
      required: [true, "Port key is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Port type is required"],
      enum: {
        values: Object.values(NodeDataType),
        message: "Invalid NodeDataType: {VALUE}",
      },
    },
    input: {
      type: String,
      enum: {
        values: NodeInputKindValues,
        message: "Invalid NodeInputKind: {VALUE}",
      },
    },
    options: {
      type: [String],
    },
    required: {
      type: Boolean,
      default: false,
    },
    defaultValue: {
      type: Schema.Types.Mixed,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);
