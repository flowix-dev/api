import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyAccessToken } from "./utils/jwt";
import { IWorkflowEventEmitter } from "./workflow/execution/WorkflowEventEmitter";

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId: string;
}

function readAccessTokenFromCookie(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
  return match?.[1];
}

export function createSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: CORS_ORIGIN, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      readAccessTokenFromCookie(socket.handshake.headers.cookie);
    if (!token) {
      return next(new Error("Authentication required"));
    }
    try {
      const payload = verifyAccessToken(token as string);
      (socket as AuthenticatedSocket).userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    socket.on("subscribe:execution", (executionId: string) => {
      socket.join(`execution:${executionId}`);
    });

    socket.on("unsubscribe:execution", (executionId: string) => {
      socket.leave(`execution:${executionId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function wireWorkflowEvents(events: IWorkflowEventEmitter): void {
  events.on("workflow.started", (payload) => {
    io?.to(`execution:${payload.executionId}`).emit("workflow.started", payload);
  });

  events.on("workflow.completed", (payload) => {
    io?.to(`execution:${payload.executionId}`).emit("workflow.completed", payload);
  });

  events.on("workflow.failed", (payload) => {
    io?.to(`execution:${payload.executionId}`).emit("workflow.failed", payload);
  });

  events.on("node.started", (payload) => {
    io?.to(`execution:${payload.executionId}`).emit("node.started", payload);
  });

  events.on("node.completed", (payload) => {
    io?.to(`execution:${payload.executionId}`).emit("node.completed", payload);
  });

  events.on("node.failed", (payload) => {
    io?.to(`execution:${payload.executionId}`).emit("node.failed", payload);
  });

  events.on("node.skipped", (payload) => {
    io?.to(`execution:${payload.executionId}`).emit("node.skipped", payload);
  });
}
