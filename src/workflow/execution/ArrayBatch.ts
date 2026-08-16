import { INodePort } from "../../interfaces/NodePort";
import { NodeDataType } from "../../types/NodeDataType";

export interface BatchPlan {
  instances: Array<Record<string, unknown>>;
  batched: boolean;
  size: number;
}

const NON_BATCHED_TYPES = new Set<NodeDataType>([
  NodeDataType.NUMBER_ARRAY,
  NodeDataType.ANY_ARRAY,
  NodeDataType.FILE,
  NodeDataType.CREDENTIALS,
]);

export function isArrayPortType(type: NodeDataType): boolean {
  return type === NodeDataType.NUMBER_ARRAY || type === NodeDataType.ANY_ARRAY;
}

export function prepareArrayInputs(
  inputs: Record<string, unknown>,
  ports: INodePort[]
): Record<string, unknown> {
  const portByKey = new Map(ports.map((port) => [port.key, port]));
  const prepared: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(inputs)) {
    const port = portByKey.get(key);
    if (port && isArrayPortType(port.type) && typeof value === "string") {
      prepared[key] = Array.from(value);
    } else {
      prepared[key] = value;
    }
  }
  return prepared;
}

export function buildBatchPlan(inputs: Record<string, unknown>, ports: INodePort[]): BatchPlan {
  const portByKey = new Map(ports.map((port) => [port.key, port]));
  let maxLength = 0;
  let hasArray = false;

  for (const [key, value] of Object.entries(inputs)) {
    const port = portByKey.get(key);
    if (port && NON_BATCHED_TYPES.has(port.type)) {
      continue;
    }
    if (Array.isArray(value)) {
      hasArray = true;
      maxLength = Math.max(maxLength, value.length);
    }
  }

  if (!hasArray) {
    return { instances: [inputs], batched: false, size: 1 };
  }

  const instances: Array<Record<string, unknown>> = [];
  for (let i = 0; i < maxLength; i++) {
    const instance: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputs)) {
      const port = portByKey.get(key);
      if (port && NON_BATCHED_TYPES.has(port.type)) {
        instance[key] = value;
        continue;
      }
      if (Array.isArray(value)) {
        instance[key] = i < value.length ? value[i] : null;
      } else {
        instance[key] = value;
      }
    }
    instances.push(instance);
  }

  return { instances, batched: true, size: maxLength };
}

export function aggregateBatchedOutputs(
  results: Array<Record<string, unknown>>
): Record<string, unknown> {
  const keys = new Set<string>();
  for (const result of results) {
    for (const key of Object.keys(result)) {
      keys.add(key);
    }
  }
  const aggregated: Record<string, unknown> = {};
  for (const key of keys) {
    aggregated[key] = results.map((result) => result[key]);
  }
  return aggregated;
}
