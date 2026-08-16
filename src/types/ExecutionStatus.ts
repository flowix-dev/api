export type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type NodeExecutionStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type TriggerType = "manual" | "scheduled" | "webhook" | "child";
