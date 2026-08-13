import { NodeDataType } from "../types/NodeDataType";
import { NodeInputKind } from "../types/NodeInputKind";

export interface INodePort {
  key: string;
  type: NodeDataType;
  input?: NodeInputKind;
  options?: string[];
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}
