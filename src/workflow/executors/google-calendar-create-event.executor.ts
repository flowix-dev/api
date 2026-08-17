import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class GoogleCalendarCreateEventExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const accessToken = String(inputs.accessToken ?? "").trim();
    const calendarId = String(inputs.calendarId ?? "primary").trim();
    const summary = String(inputs.summary ?? "").trim();
    const description = String(inputs.description ?? "").trim();
    const start = String(inputs.start ?? "").trim();
    const end = String(inputs.end ?? "").trim();
    const location = String(inputs.location ?? "").trim();
    const timezone = String(inputs.timezone ?? "UTC").trim();

    if (!accessToken || !summary || !start || !end) {
      throw new Error("accessToken, summary, start y end son requeridos");
    }

    const eventBody: Record<string, unknown> = {
      summary,
      description: description || undefined,
      location: location || undefined,
      start: {
        dateTime: start,
        timeZone: timezone,
      },
      end: {
        dateTime: end,
        timeZone: timezone,
      },
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Google Calendar error: ${(error as { error?: { message?: string } })?.error?.message ?? response.status}`
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      outputs: {
        eventId: data.id,
        htmlLink: data.htmlLink,
        status: data.status,
        summary: data.summary,
        start: (data.start as { dateTime?: string })?.dateTime,
        end: (data.end as { dateTime?: string })?.dateTime,
      },
    };
  }
}
