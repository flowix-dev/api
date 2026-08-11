import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { NodeDefinition } from "../../models/NodeDefinition";

export interface ExecutorResult {
  outputs: Record<string, unknown>;
}

export interface INodeExecutor {
  execute(node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult>;
}

type ExecutorFactory = () => INodeExecutor;

class ExecutorRegistry {
  private readonly executors = new Map<string, ExecutorFactory>();

  register(fnKey: string, factory: ExecutorFactory): void {
    if (this.executors.has(fnKey)) {
      throw new Error(`Executor already registered for fnKey: ${fnKey}`);
    }
    this.executors.set(fnKey, factory);
  }

  getExecutor(fnKey: string): INodeExecutor {
    const factory = this.executors.get(fnKey);
    if (!factory) {
      throw new Error(`No executor registered for fnKey: ${fnKey}`);
    }
    return factory();
  }

  hasExecutor(fnKey: string): boolean {
    return this.executors.has(fnKey);
  }

  async getExecutorForNode(node: IWorkflowNode): Promise<INodeExecutor> {
    const definition = await NodeDefinition.findById(node.nodeDefinitionId);
    if (!definition) {
      throw new Error(`NodeDefinition not found for id: ${node.nodeDefinitionId}`);
    }
    return this.getExecutor(definition.fnKey);
  }
}

export const executorRegistry = new ExecutorRegistry();
