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
import { buildConverseTool } from "../chat/tools";
import { executorRegistry } from "../workflow/executors/registry";
import { ExecutionContext } from "../workflow/execution/ExecutionContext";

const MAX_TOOL_ITERATIONS = 10;

export interface WorkflowChatEventSink {
  onUserMessage?: (message: IWorkflowChatMessage) => void;
  onContentDelta?: (text: string) => void;
  onToolStart?: (call: IWorkflowChatToolCall) => void;
  onToolEnd?: (call: IWorkflowChatToolCall) => void;
  onAssistantMessage?: (message: IWorkflowChatMessage) => void;
  onWorkflowSwitched?: (workflowId: string) => void;
}

const META_TOOLS: ConverseTool[] = [
  {
    toolSpec: {
      name: "get_workflow",
      description: "Obtiene el workflow actual completo con todos sus nodos y edges.",
      inputSchema: { json: { type: "object", properties: {} } },
    },
  },
  {
    toolSpec: {
      name: "list_node_definitions",
      description:
        "Lista todas las definiciones de nodos disponibles con sus IDs, nombres, categorías e inputs/outputs.",
      inputSchema: { json: { type: "object", properties: {} } },
    },
  },
];

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

    const nodeTools = nodeDefinitions
      .filter((def) => executorRegistry.hasExecutor(def.fnKey))
      .map((def) => buildConverseTool(def));
    const tools = [...META_TOOLS, ...nodeTools];
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
            userId,
            nodeDefinitions,
            sink
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
    userId: string,
    nodeDefinitions: Array<{
      _id: unknown;
      fnKey: string;
      name: string;
      category: string;
      inputs: Array<{ key: string; type: string }>;
      outputs: Array<{ key: string; type: string }>;
    }>,
    sink: WorkflowChatEventSink
  ): Promise<unknown> {
    if (toolName === "get_workflow") {
      return { nodes: workflow.nodes, edges: workflow.edges };
    }

    if (toolName === "list_node_definitions") {
      return nodeDefinitions.map((def) => ({
        _id: def._id,
        fnKey: def.fnKey,
        name: def.name,
        category: def.category,
        inputs: def.inputs.map((p) => ({ key: p.key, type: p.type })),
        outputs: def.outputs.map((p) => ({ key: p.key, type: p.type })),
      }));
    }

    const fnKey =
      nodeDefinitions.find((def) => {
        const generatedName = `tool_${def.fnKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
        return generatedName === toolName;
      })?.fnKey ?? toolName;

    if (!executorRegistry.hasExecutor(fnKey)) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const executor = executorRegistry.getExecutor(fnKey);
    const context = new ExecutionContext();
    context.workflowId = workflowId;
    context.userId = userId;

    const result = await executor.execute(
      {
        id: 0,
        nodeDefinitionId: new Types.ObjectId(),
        disabled: false,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        inputs,
      } as never,
      inputs,
      context
    );

    if (fnKey === "create.workflow" && result.outputs.id) {
      const newId = result.outputs.id as string;
      workflow._id = new Types.ObjectId(newId);
      workflow.nodes = [];
      workflow.edges = [];
      sink.onWorkflowSwitched?.(newId);
    }

    return result.outputs;
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
      "",
      "FLUJO DE TRABAJO:",
      "1. Usá get_workflow para ver el estado actual del workflow.",
      "2. Usá list_node_definitions para ver los tipos de nodos disponibles.",
      "3. Hacé las modificaciones necesarias.",
      "4. Usá edit_workflow enviando los arrays completos de nodes y edges con los cambios aplicados.",
      "5. Si el usuario pide crear un workflow nuevo, usá create_workflow y después edit_workflow para poblarlo.",
      "",
      "IMPORTANTE: edit_workflow reemplaza TODO el contenido del workflow. Siempre enviá los arrays completos.",
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
