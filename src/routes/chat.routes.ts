import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import {
  createChat,
  deleteChat,
  getChat,
  getMessages,
  listChats,
  listFiles,
  sendChatMessage,
  updateChat,
  uploadFile,
} from "../controllers/chat.controller";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.get("/", authenticate, listChats);
router.post("/", authenticate, createChat);
router.get("/:chatId", authenticate, getChat);
router.patch("/:chatId", authenticate, updateChat);
router.delete("/:chatId", authenticate, deleteChat);
router.get("/:chatId/messages", authenticate, getMessages);
router.post("/:chatId/messages", authenticate, sendChatMessage);
router.get("/:chatId/files", authenticate, listFiles);
router.post("/:chatId/files", authenticate, upload.single("file"), uploadFile);

export default router;
