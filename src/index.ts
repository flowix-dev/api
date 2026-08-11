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
import "./workflow/executors/index";
import { connectRedis, disconnectRedis, redisHealth } from "./utils/redis";
import { createSocketServer, wireWorkflowEvents } from "./socket";
import { workflowService } from "./services/workflow.service";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/flowix";

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

const api = express.Router();
app.use("/api", api);

api.use("/auth", authRoutes);
api.use("/users", usersRoutes);
api.use("/workflows", workflowRoutes);
api.use("/node-definitions", nodeDefinitionsRoutes);
api.use("/executions", executionRoutes);

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
