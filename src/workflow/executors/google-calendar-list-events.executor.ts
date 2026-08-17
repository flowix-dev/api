import { IWorkflowNode } from "../../interfaces/WorkflowNode";
import { INodeExecutor, ExecutorResult } from "./registry";

export class GoogleCalendarListEventsExecutor implements INodeExecutor {
  async execute(_node: IWorkflowNode, inputs: Record<string, unknown>): Promise<ExecutorResult> {
    const accessToken = String(inputs.accessToken ?? "").trim();
    const calendarId = String(inputs.calendarId ?? "primary").trim();
    const timeMin = String(inputs.timeMin ?? "").trim();
    const timeMax = String(inputs.timeMax ?? "").trim();
    const maxResults = Number(inputs.maxResults ?? 10);
    const query = String(inputs.query ?? "").trim();
    const timezone = String(inputs.timezone ?? "UTC").trim();

    if (!accessToken) {
      throw new Error("accessToken es requerido");
    }

    const params = new URLSearchParams({
      maxResults: String(maxResults),
      singleEvents: "true",
      orderBy: "startTime",
      timeZone: timezone,
    });

    if (timeMin) params.append("timeMin", timeMin);
    if (timeMax) params.append("timeMax", timeMax);
    if (query) params.append("q", query);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Google Calendar error: ${(error as { error?: { message?: string } })?.error?.message ?? response.status}`
      );
    }

    const data = (await response.json()) as {
      items?: Array<{
        id?: string;
        summary?: string;
        description?: string;
        location?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        htmlLink?: string;
        status?: string;
        creator?: { email?: string };
      }>;
    };

    const events = (data.items ?? []).map((event) => ({
      eventId: event.id,
      summary: event.summary ?? "",
      description: event.description ?? "",
      location: event.location ?? "",
      start: event.start?.dateTime ?? event.start?.date ?? "",
      end: event.end?.dateTime ?? event.end?.date ?? "",
      htmlLink: event.htmlLink ?? "",
      status: event.status ?? "",
      creator: event.creator?.email ?? "",
    }));

    return {
      outputs: {
        events,
        count: events.length,
      },
    };
  }
}
