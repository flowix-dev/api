import { INodeDefinition } from "../interfaces/NodeDefinition";
import { ConverseTool } from "./types";

export function buildToolName(fnKey: string): string {
  return `tool_${fnKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function typeToJsonSchemaType(type: string): string | undefined {
  switch (type) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "string":
      return "string";
    case "any[]":
    case "number[]":
      return "array";
    case "object":
    case "json":
      return "object";
    default:
      return undefined;
  }
}

export function buildConverseTool(def: INodeDefinition): ConverseTool {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const input of def.inputs) {
    const schemaType = typeToJsonSchemaType(input.type);
    const property: Record<string, unknown> = {
      description: input.description || input.key,
    };
    if (schemaType) {
      property.type = schemaType;
    }
    properties[input.key] = property;
    if (input.required) {
      required.push(input.key);
    }
  }

  const outputs = def.outputs.map((o) => o.key).join(", ") || "none";

  return {
    toolSpec: {
      name: buildToolName(def.fnKey),
      description: `Execute the "${def.name}" node. Returns: ${outputs}.`,
      inputSchema: {
        json: {
          type: "object",
          properties,
          required,
        },
      },
    },
  };
}
