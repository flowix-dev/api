import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class DateFormatterExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const inputDate = String(inputs.date ?? "").trim();
    const format = String(inputs.format ?? "DD/MM/YYYY HH:mm");
    const timezone = String(inputs.timezone ?? "").trim();

    const date = inputDate ? new Date(inputDate) : new Date();
    if (isNaN(date.getTime())) {
      throw new Error(`Fecha inválida: "${inputDate}"`);
    }

    const tzOptions: Intl.DateTimeFormatOptions = timezone ? { timeZone: timezone } : {};

    const getDateParts = (d: Date) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        ...tzOptions,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
        .formatToParts(d)
        .reduce(
          (acc, part) => {
            acc[part.type] = part.value;
            return acc;
          },
          {} as Record<string, string>
        );
      return {
        DD: parts.day,
        MM: parts.month,
        YYYY: parts.year,
        HH: parts.hour === "24" ? "00" : parts.hour,
        mm: parts.minute,
        ss: parts.second,
      };
    };

    const parts = getDateParts(date);
    const formatted = format
      .replace("YYYY", parts.YYYY)
      .replace("MM", parts.MM)
      .replace("DD", parts.DD)
      .replace("HH", parts.HH)
      .replace("mm", parts.mm)
      .replace("ss", parts.ss);

    const relative = this.getRelativeTime(date);

    return {
      outputs: {
        formatted,
        date: date.toISOString(),
        timestamp: date.getTime(),
        relative,
        ...parts,
      },
    };
  }

  private getRelativeTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const absDiff = Math.abs(diff);
    const future = diff < 0;

    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let result: string;
    if (seconds < 60) {
      result = "hace unos segundos";
    } else if (minutes < 60) {
      result = `hace ${minutes} minuto${minutes !== 1 ? "s" : ""}`;
    } else if (hours < 24) {
      result = `hace ${hours} hora${hours !== 1 ? "s" : ""}`;
    } else if (days < 30) {
      result = `hace ${days} día${days !== 1 ? "s" : ""}`;
    } else {
      result = date.toLocaleDateString("es-AR");
    }

    return future ? `en ${result.replace("hace ", "")}` : result;
  }
}
