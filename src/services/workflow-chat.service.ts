import { Types } from "mongoose";
import { Workflow } from "../models/Workflow";
import { NodeDefinition } from "../models/NodeDefinition";
import { WorkflowChatMessage } from "../models/WorkflowChatMessage";
import type { IWorkflowChatMessage, IWorkflowChatToolCall } from "../interfaces/WorkflowChat";
import type {
  ConverseContentBlock,
  ConverseMessage,
  ConverseStreamParams,
  ConverseTool,
  StreamedToolUse,
} from "../chat/types";
import { converse as puterConverse, streamConverse as puterStreamConverse } from "../chat/puter";
import { DEFAULT_MODEL_ID, getModelInfo } from "../chat/models";
import { User } from "../models/User";

const MAX_TOOL_ITERATIONS = 10;

export interface WorkflowChatEventSink {
  onUserMessage?: (message: IWorkflowChatMessage) => void;
  onContentDelta?: (text: string) => void;
  onToolStart?: (call: IWorkflowChatToolCall) => void;
  onToolEnd?: (call: IWorkflowChatToolCall) => void;
  onAssistantMessage?: (message: IWorkflowChatMessage) => void;
}

interface WorkflowChatTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const WORKFLOW_TOOLS: WorkflowChatTool[] = [
  {
    name: "get_workflow",
    description: "Obtiene el workflow actual completo con todos sus nodos y edges.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_node",
    description: "Agrega un nodo nuevo al workflow.",
    inputSchema: {
      type: "object",
      properties: {
        nodeDefinitionId: { type: "string", description: "ID del NodeDefinition" },
        name: { type: "string", description: "Nombre del nodo" },
        x: { type: "number", description: "Posición X en el canvas" },
        y: { type: "number", description: "Posición Y en el canvas" },
        inputs: { type: "object", description: "Valores de entrada del nodo" },
      },
      required: ["nodeDefinitionId", "name", "x", "y"],
    },
  },
  {
    name: "delete_node",
    description: "Elimina un nodo del workflow por su ID.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "number", description: "ID numérico del nodo" },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "update_node",
    description: "Actualiza las propiedades de un nodo existente.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "number", description: "ID numérico del nodo" },
        name: { type: "string", description: "Nuevo nombre" },
        inputs: { type: "object", description: "Nuevos valores de entrada" },
        x: { type: "number", description: "Nueva posición X" },
        y: { type: "number", description: "Nueva posición Y" },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "create_edge",
    description: "Conecta un output de un nodo con un input de otro nodo.",
    inputSchema: {
      type: "object",
      properties: {
        sourceNodeId: { type: "number", description: "ID del nodo origen" },
        sourceKey: { type: "string", description: "Key del output" },
        targetNodeId: { type: "number", description: "ID del nodo destino" },
        targetKey: { type: "string", description: "Key del input" },
      },
      required: ["sourceNodeId", "sourceKey", "targetNodeId", "targetKey"],
    },
  },
  {
    name: "delete_edge",
    description: "Elimina una conexión entre nodos.",
    inputSchema: {
      type: "object",
      properties: {
        sourceNodeId: { type: "number", description: "ID del nodo origen" },
        sourceKey: { type: "string", description: "Key del output" },
        targetNodeId: { type: "number", description: "ID del nodo destino" },
        targetKey: { type: "string", description: "Key del input" },
      },
      required: ["sourceNodeId", "sourceKey", "targetNodeId", "targetKey"],
    },
  },
  {
    name: "list_node_definitions",
    description:
      "Lista todas las definiciones de nodos disponibles con sus IDs, nombres, categorías e inputs/outputs.",
    inputSchema: { type: "object", properties: {} },
  },
];

function toConverseTool(tool: WorkflowChatTool): ConverseTool {
  return {
    toolSpec: {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        json: tool.inputSchema as {
          type: string;
          properties: Record<string, unknown>;
          required?: string[];
        },
      },
    },
  };
}

function buildToolResult(toolUseId: string, data: unknown): ConverseContentBlock {
  return {
    toolResult: {
      toolUseId,
      content: [{ json: data }],
    },
  };
}

function buildToolError(toolUseId: string, message: string): ConverseContentBlock {
  return {
    toolResult: {
      toolUseId,
      content: [{ text: `Error: ${message}` }],
      status: "error",
    },
  };
}

export class WorkflowChatService {
  async sendMessage(
    workflowId: string,
    userId: string,
    content: string,
    sink: WorkflowChatEventSink
  ): Promise<IWorkflowChatMessage> {
    const workflow = await Workflow.findOne({
      _id: workflowId,
      authorId: userId,
    }).lean();

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    const userMessage = await WorkflowChatMessage.create({
      workflowId: new Types.ObjectId(workflowId),
      authorId: new Types.ObjectId(userId),
      role: "user",
      content,
      toolCalls: [],
    });
    sink.onUserMessage?.(userMessage);

    const nodeDefinitions = await NodeDefinition.find().sort({ category: 1, name: 1 });

    const tools = WORKFLOW_TOOLS.map(toConverseTool);
    const system = this.buildSystemPrompt(workflow, nodeDefinitions);

    const history = await WorkflowChatMessage.find({
      workflowId: new Types.ObjectId(workflowId),
    })
      .sort({ createdAt: 1 })
      .lean();

    const messages = this.buildConversation(history);

    const user = await User.findById(userId).select("puterToken").lean();
    const puterToken = user?.puterToken ?? null;

    let finalText = "";
    const finalToolCalls: IWorkflowChatToolCall[] = [];
    const modelAvailable = puterToken !== null;

    const modelInfo = getModelInfo(DEFAULT_MODEL_ID)!;

    const currentWorkflow = JSON.parse(JSON.stringify(workflow)) as {
      _id: unknown;
      nodes: Array<Record<string, unknown>>;
      edges: Array<Record<string, unknown>>;
    };

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      if (!modelAvailable) {
        finalText = "El modelo de IA no está disponible. Conectá Puter desde la configuración.";
        sink.onContentDelta?.(finalText);
        break;
      }

      let text: string;
      let toolUses: StreamedToolUse[];
      const modelParams: ConverseStreamParams = {
        modelId: modelInfo.modelId,
        system,
        messages,
        tools,
        maxTokens: 4096,
        temperature: 0.3,
      };

      try {
        ({ text, toolUses } = await puterStreamConverse(puterToken!, modelParams, (delta) =>
          sink.onContentDelta?.(delta)
        ));
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        const isStreamingToolUseUnsupported =
          /tool use/i.test(errMessage) && /streaming/i.test(errMessage);

        if (isStreamingToolUseUnsupported) {
          const result = await puterConverse(puterToken!, modelParams);
          text = result.text;
          toolUses = result.toolUses;
          if (text) {
            sink.onContentDelta?.(text);
          }
        } else {
          throw error;
        }
      }

      if (text) {
        finalText += text;
      }

      if (toolUses.length === 0) {
        break;
      }

      const assistantBlocks: ConverseContentBlock[] = [];
      const toolResultBlocks: ConverseContentBlock[] = [];

      for (const toolUse of toolUses) {
        assistantBlocks.push({
          toolUse: {
            toolUseId: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
          },
        });

        const toolCall: IWorkflowChatToolCall = {
          id: toolUse.id,
          name: toolUse.name,
          arguments: toolUse.input,
          status: "completed",
        };
        sink.onToolStart?.(toolCall);

        try {
          const result = await this.executeTool(
            toolUse.name,
            toolUse.input,
            currentWorkflow,
            workflowId,
            nodeDefinitions
          );

          toolCall.output = result;
          finalToolCalls.push(toolCall);
          sink.onToolEnd?.(toolCall);
          toolResultBlocks.push(buildToolResult(toolUse.id, result));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          toolCall.error = message;
          toolCall.status = "failed";
          finalToolCalls.push(toolCall);
          sink.onToolEnd?.(toolCall);
          toolResultBlocks.push(buildToolError(toolUse.id, message));
        }
      }

      messages.push({ role: "assistant", content: assistantBlocks });
      messages.push({ role: "user", content: toolResultBlocks });
    }

    const assistantMessage = await WorkflowChatMessage.create({
      workflowId: new Types.ObjectId(workflowId),
      authorId: new Types.ObjectId(userId),
      role: "assistant",
      content: finalText,
      toolCalls: finalToolCalls,
    });
    sink.onAssistantMessage?.(assistantMessage);

    return assistantMessage;
  }

  async getHistory(workflowId: string, userId: string): Promise<IWorkflowChatMessage[]> {
    const workflow = await Workflow.findOne({
      _id: workflowId,
      authorId: userId,
    }).lean();

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    return WorkflowChatMessage.find({
      workflowId: new Types.ObjectId(workflowId),
    })
      .sort({ createdAt: 1 })
      .lean();
  }

  private async executeTool(
    toolName: string,
    inputs: Record<string, unknown>,
    workflow: {
      _id: unknown;
      nodes: Array<Record<string, unknown>>;
      edges: Array<Record<string, unknown>>;
    },
    workflowId: string,
    nodeDefinitions: Array<{
      _id: unknown;
      fnKey: string;
      name: string;
      category: string;
      inputs: Array<{ key: string; type: string }>;
      outputs: Array<{ key: string; type: string }>;
    }>
  ): Promise<unknown> {
    switch (toolName) {
      case "get_workflow":
        return {
          nodes: workflow.nodes,
          edges: workflow.edges,
        };

      case "create_node": {
        const maxId = workflow.nodes.reduce((max, n) => Math.max(max, (n.id as number) ?? 0), 0);
        const newNode: Record<string, unknown> = {
          id: maxId + 1,
          nodeDefinitionId: inputs.nodeDefinitionId,
          name: inputs.name as string,
          disabled: false,
          x: (inputs.x as number) ?? 100,
          y: (inputs.y as number) ?? 100,
          w: 200,
          h: 80,
          inputs: (inputs.inputs as Record<string, unknown>) ?? {},
        };
        workflow.nodes.push(newNode);

        await Workflow.findByIdAndUpdate(workflowId, {
          $push: { nodes: newNode },
        });

        return { success: true, node: newNode };
      }

      case "delete_node": {
        const nodeId = inputs.nodeId as number;
        workflow.nodes = workflow.nodes.filter((n) => n.id !== nodeId);
        workflow.edges = workflow.edges.filter(
          (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
        );

        await Workflow.findByIdAndUpdate(workflowId, {
          $pull: { nodes: { id: nodeId } },
          $pullAll: {
            edges: workflow.edges.filter(
              (e) => (e.sourceNodeId as number) === nodeId || (e.targetNodeId as number) === nodeId
            ),
          },
        });

        return { success: true };
      }

      case "update_node": {
        const nodeId = inputs.nodeId as number;
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }

        if (inputs.name !== undefined) node.name = inputs.name;
        if (inputs.inputs !== undefined)
          node.inputs = {
            ...(node.inputs as Record<string, unknown>),
            ...(inputs.inputs as Record<string, unknown>),
          };
        if (inputs.x !== undefined) node.x = inputs.x;
        if (inputs.y !== undefined) node.y = inputs.y;

        await Workflow.findOneAndUpdate(
          { _id: workflowId, "nodes.id": nodeId },
          {
            $set: {
              "nodes.$": node,
            },
          }
        );

        return { success: true, node };
      }

      case "create_edge": {
        const edge = {
          sourceNodeId: inputs.sourceNodeId,
          sourceKey: inputs.sourceKey,
          targetNodeId: inputs.targetNodeId,
          targetKey: inputs.targetKey,
        };
        workflow.edges.push(edge);

        await Workflow.findByIdAndUpdate(workflowId, {
          $push: { edges: edge },
        });

        return { success: true, edge };
      }

      case "delete_edge": {
        const edgeIndex = workflow.edges.findIndex(
          (e) =>
            e.sourceNodeId === inputs.sourceNodeId &&
            e.sourceKey === inputs.sourceKey &&
            e.targetNodeId === inputs.targetNodeId &&
            e.targetKey === inputs.targetKey
        );

        if (edgeIndex === -1) {
          throw new Error("Edge not found");
        }

        workflow.edges.splice(edgeIndex, 1);

        await Workflow.findByIdAndUpdate(workflowId, {
          $pull: {
            edges: {
              sourceNodeId: inputs.sourceNodeId,
              sourceKey: inputs.sourceKey,
              targetNodeId: inputs.targetNodeId,
              targetKey: inputs.targetKey,
            },
          },
        });

        return { success: true };
      }

      case "list_node_definitions":
        return nodeDefinitions.map((def) => ({
          _id: def._id,
          fnKey: def.fnKey,
          name: def.name,
          category: def.category,
          inputs: def.inputs.map((p) => ({ key: p.key, type: p.type })),
          outputs: def.outputs.map((p) => ({ key: p.key, type: p.type })),
        }));

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private buildConversation(history: IWorkflowChatMessage[]): ConverseMessage[] {
    const messages: ConverseMessage[] = [];
    for (const message of history) {
      if (message.role === "user") {
        messages.push({ role: "user", content: [{ text: message.content }] });
      } else {
        messages.push({ role: "assistant", content: [{ text: message.content }] });
      }
    }
    return messages;
  }

  private buildSystemPrompt(
    workflow: { nodes: unknown[]; edges: unknown[] },
    nodeDefinitions: Array<{ _id: unknown; fnKey: string; name: string; category: string }>
  ): string {
    const nodes = workflow.nodes as Array<{
      id: number;
      nodeDefinitionId: unknown;
      name: string;
      x: number;
      y: number;
    }>;
    const edges = workflow.edges as Array<{
      sourceNodeId: number;
      sourceKey: string;
      targetNodeId: number;
      targetKey: string;
    }>;

    const nodesSummary = nodes
      .map((n) => {
        const def = nodeDefinitions.find((d) => String(d._id) === String(n.nodeDefinitionId));
        return `  - ID: ${n.id}, Nombre: "${n.name}", Tipo: ${def?.fnKey ?? "unknown"}, Posición: (${n.x}, ${n.y})`;
      })
      .join("\n");

    const edgesSummary = edges
      .map((e) => {
        const sourceNode = nodes.find((n) => n.id === e.sourceNodeId);
        const targetNode = nodes.find((n) => n.id === e.targetNodeId);
        return `  - ${sourceNode?.name ?? e.sourceNodeId}.${e.sourceKey} → ${targetNode?.name ?? e.targetNodeId}.${e.targetKey}`;
      })
      .join("\n");

    const availableNodes = nodeDefinitions
      .map((def) => `- ${def.name} (${def.fnKey}, id: ${def._id})`)
      .join("\n");

    return [
      "Sos el asistente de Flowix para workflows. Tu trabajo es ayudar al usuario a crear y modificar workflows.",
      "Los workflows están compuestos por nodos conectados por edges.",
      "Cada nodo tiene un tipo (fnKey) que determina qué hace.",
      "",
      "IMPORTANTE: Cuando el usuario te pida crear o modificar un workflow, usá las herramientas disponibles.",
      "Siempre explicá qué estás haciendo cuando creás o modificás el workflow.",
      "",
      "Estructura actual del workflow:",
      `- Nodos (${nodes.length}):\n${nodesSummary || "  (vacío)"}`,
      `- Conexiones (${edges.length}):\n${edgesSummary || "  (ninguna)"}`,
      "",
      "Nodos disponibles:",
      availableNodes,
    ].join("\n");
  }
}

export const workflowChatService = new WorkflowChatService();
