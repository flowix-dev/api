import { IToolCall } from "../interfaces/ChatMessage";

const TOOL_LABELS: Record<string, string> = {
  "http.request": "petición HTTP",
  sum: "suma",
  delay: "retraso",
};

export function buildMockReply(toolCall: IToolCall): string {
  const label = TOOL_LABELS[toolCall.name] ?? toolCall.name;
  if (toolCall.status === "failed") {
    return [
      `Intenté ejecutar la herramienta **${label}** pero falló:`,
      "```text",
      toolCall.error ?? "Unknown error",
      "```",
    ].join("\n");
  }
  const output = JSON.stringify(toolCall.output, null, 2);
  return [
    `He ejecutado la herramienta **${label}** con los siguientes datos:`,
    "```json",
    output,
    "```",
  ].join("\n");
}

export function buildMockGenericReply(message: string): string {
  return [
    "El modelo de IA no está disponible en este entorno (no hay una cuenta de Puter conectada).",
    `Recibí tu mensaje: "${message}"`,
    "Prueba con una acción como: *suma 3 y 4*, *envía un correo a alguien@ejemplo.com* o *guarda algo en un bucket S3*.",
  ].join("\n\n");
}
