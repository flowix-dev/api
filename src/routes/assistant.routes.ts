import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import {
  listAssistants,
  createAssistant,
  getAssistant,
  updateAssistant,
  deleteAssistant,
  uploadAssistantFile,
  deleteAssistantFile,
} from "../controllers/assistant.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/", authenticate, listAssistants);
router.post("/", authenticate, createAssistant);
router.get("/:assistantId", authenticate, getAssistant);
router.patch("/:assistantId", authenticate, updateAssistant);
router.delete("/:assistantId", authenticate, deleteAssistant);
router.post("/:assistantId/files", authenticate, upload.single("file"), uploadAssistantFile);
router.delete("/:assistantId/files/:fileName", authenticate, deleteAssistantFile);

export default router;
