import { IWorkflowEdge } from "../../interfaces/WorkflowEdge";
import { ExecutionContext } from "./ExecutionContext";

export class InputResolver {
  resolve(
    configuredInputs: Record<string, unknown>,
    incomingEdges: IWorkflowEdge[],
    context: ExecutionContext
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = { ...configuredInputs };

    for (const edge of incomingEdges) {
      const sourceOutput = context.getOutput(edge.sourceNodeId, edge.sourceKey);
      if (sourceOutput !== undefined) {
        resolved[edge.targetKey] = sourceOutput;
      }
    }

    return resolved;
  }
}
