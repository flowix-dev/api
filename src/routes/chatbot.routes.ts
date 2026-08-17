import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import {
  listChatbots,
  createChatbot,
  getChatbot,
  updateChatbot,
  deleteChatbot,
  regenerateChatbotToken,
  uploadChatbotFile,
  deleteChatbotFile,
} from "../controllers/chatbot.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/", authenticate, listChatbots);
router.post("/", authenticate, createChatbot);
router.get("/:chatbotId", authenticate, getChatbot);
router.patch("/:chatbotId", authenticate, updateChatbot);
router.delete("/:chatbotId", authenticate, deleteChatbot);
router.post("/:chatbotId/regenerate-token", authenticate, regenerateChatbotToken);
router.post("/:chatbotId/files", authenticate, upload.single("file"), uploadChatbotFile);
router.delete("/:chatbotId/files/:fileName", authenticate, deleteChatbotFile);

export default router;
