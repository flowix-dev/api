import { Schema } from "mongoose";
import { NodeDataType } from "../types/NodeDataType";

export const NodePortSchema = new Schema(
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
