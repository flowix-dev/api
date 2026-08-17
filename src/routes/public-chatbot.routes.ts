import { Router } from "express";
import multer from "multer";
import { chatbotChatService } from "../services/chatbot-chat.service";
import { buildEmbedScript } from "../chatbot-widget";
import { parseFileBuffer } from "../utils/fileParser";
import { User } from "../models/User";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/:chatbotId/embed.js", async (req, res) => {
  try {
    const script = buildEmbedScript({
      apiUrl: process.env.PUBLIC_API_URL || "http://localhost:8000/api",
      chatbotId: req.params.chatbotId,
    });
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(script);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load embed";
    res.status(500).send(`console.error(${JSON.stringify(message)});`);
  }
});

router.get("/:chatbotId/config", async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const token = req.query.token as string;

    if (!token) {
      res.status(400).json({ message: "Token es requerido" });
      return;
    }

    const origin = req.headers.origin ?? undefined;
    const chatbot = await chatbotChatService.validatePublicChatbot(chatbotId, token, origin);

    res.json({
      chatbot: {
        name: chatbot.name,
        avatarUrl: chatbot.avatarUrl,
        welcomeMessage: chatbot.welcomeMessage,
        placeholder: chatbot.placeholder,
        primaryColor: chatbot.primaryColor,
        position: chatbot.position,
        autoOpen: chatbot.autoOpen,
        showPoweredBy: chatbot.showPoweredBy,
        allowFileUpload: chatbot.allowFileUpload,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load chatbot";
    res.status(403).json({ message });
  }
});

router.post("/:chatbotId/upload", upload.single("file"), async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const token = req.body.token as string;

    if (!token) {
      res.status(400).json({ message: "Token es requerido" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const origin = req.headers.origin ?? undefined;
    const chatbot = await chatbotChatService.validatePublicChatbot(
      chatbotId as string,
      token as string,
      origin
    );

    if (!chatbot.allowFileUpload) {
      res.status(403).json({ message: "Este chatbot no permite subir archivos" });
      return;
    }

    const owner = await User.findById(chatbot.authorId).select("puterToken").lean();
    const parsed = await parseFileBuffer(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      owner?.puterToken ?? null
    );

    res.json({
      name: req.file.originalname,
      text: parsed.text,
      format: parsed.format,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload file";
    res.status(400).json({ message });
  }
});

router.post("/:chatbotId/messages", async (req, res) => {
  try {
    const { chatbotId } = req.params;
    const { token, content, history } = req.body as {
      token?: string;
      content?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!token || !content?.trim()) {
      res.status(400).json({ message: "Token y content son requeridos" });
      return;
    }

    const origin = req.headers.origin ?? undefined;
    const chatbot = await chatbotChatService.validatePublicChatbot(chatbotId, token, origin);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const sendEvent = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const text = await chatbotChatService.sendMessage(
        chatbot,
        { content: content.trim(), history },
        {
          onContentDelta: (delta) => sendEvent("content.delta", { delta }),
          onToolStart: (name) => sendEvent("tool.started", { name }),
        }
      );

      sendEvent("message.completed", { content: text });
      sendEvent("done", {});
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendEvent("error", { message });
    }

    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    res.status(400).json({ message });
  }
});

export default router;
