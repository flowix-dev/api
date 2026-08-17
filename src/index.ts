import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import workflowRoutes from "./routes/workflow.routes";
import executionRoutes from "./routes/execution.routes";
import nodeDefinitionsRoutes from "./routes/node-definitions.routes";
import chatRoutes from "./routes/chat.routes";
import modelRoutes from "./routes/model.routes";
import assistantRoutes from "./routes/assistant.routes";
import credentialRoutes from "./routes/credential.routes";
import webhookRoutes from "./routes/webhook.routes";
import workflowChatRoutes from "./routes/workflow-chat.routes";
import chatbotRoutes from "./routes/chatbot.routes";
import publicChatbotRoutes from "./routes/public-chatbot.routes";
import "./workflow/executors/index";
import { connectRedis, disconnectRedis, redisHealth } from "./utils/redis";
import { createSocketServer, wireWorkflowEvents } from "./socket";
import { workflowService } from "./services/workflow.service";
import { workflowScheduler } from "./workflow/WorkflowScheduler";
import { emailTriggerManager } from "./workflow/EmailTriggerManager";

process.on("uncaughtException", (error) => {
  console.error("[process] Uncaught exception (non-fatal):", error);
});

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/flowix";

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

const api = express.Router();

if (process.env.NODE_ENV === "development") {
  app.use("/api", api);
}

api.use("/auth", authRoutes);
api.use("/users", usersRoutes);
api.use("/workflows", workflowRoutes);
api.use("/node-definitions", nodeDefinitionsRoutes);
api.use("/executions", executionRoutes);
api.use("/chats", chatRoutes);
api.use("/models", modelRoutes);
api.use("/assistants", assistantRoutes);
api.use("/credentials", credentialRoutes);
api.use("/webhooks", webhookRoutes);
api.use("/workflow-chat", workflowChatRoutes);
api.use("/chatbots", chatbotRoutes);
api.use("/chatbots", publicChatbotRoutes);

app.get("/health", async (_req, res) => {
  const redisStatus = await redisHealth();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    redis: redisStatus,
  });
});

async function start(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    await connectRedis();

    createSocketServer(server);
    wireWorkflowEvents(workflowService.events);
    console.log("Socket.io initialized");

    workflowScheduler.start();
    console.log("Workflow scheduler started");

    emailTriggerManager.start();
    console.log("Email trigger manager started");

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  try {
    workflowScheduler.stop();
    emailTriggerManager.stop();
    await disconnectRedis();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();

export default app;
