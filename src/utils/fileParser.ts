import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import { parse as parseCsv } from "csv-parse/sync";
import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";
import { transcribeImageWithPuter } from "../chat/puter";

export interface ParseResult {
  text: string;
  format: string;
  rows?: unknown;
}

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "log",
  "json",
  "xml",
  "html",
  "css",
  "js",
  "ts",
  "py",
  "rb",
  "go",
  "java",
  "yaml",
  "yml",
  "sh",
  "sql",
  "ini",
  "tsv",
]);

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif"]);

function detectFormat(extension: string, type: string): string {
  const lowerType = (type || "").toLowerCase();

  if (extension === "csv" || lowerType.includes("csv")) return "csv";
  if (extension === "pdf" || lowerType.includes("pdf")) return "pdf";
  if (
    extension === "docx" ||
    extension === "doc" ||
    lowerType.includes("word") ||
    lowerType.includes("officedocument.wordprocessing")
  )
    return "docx";
  if (
    extension === "xlsx" ||
    extension === "xls" ||
    lowerType.includes("excel") ||
    lowerType.includes("officedocument.spreadsheet")
  )
    return "xlsx";
  if (
    extension === "pptx" ||
    extension === "ppt" ||
    lowerType.includes("powerpoint") ||
    lowerType.includes("officedocument.presentation")
  )
    return "pptx";
  if (IMAGE_EXTENSIONS.has(extension) || lowerType.startsWith("image/")) return "image";
  if (TEXT_EXTENSIONS.has(extension) || lowerType.startsWith("text/")) return "text";
  return "unknown";
}

let ocrWorker: Promise<{
  recognize: (image: Buffer) => Promise<{ data: { text: string } }>;
}> | null = null;

function getOcrWorker(): Promise<{
  recognize: (image: Buffer) => Promise<{ data: { text: string } }>;
}> {
  if (!ocrWorker) {
    ocrWorker = createWorker("eng+spa").then((worker) => ({
      recognize: (image) => worker.recognize(image),
    }));
  }
  return ocrWorker;
}

async function ocrImage(buffer: Buffer): Promise<string> {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(buffer);
  return (data.text || "").trim();
}

async function transcribeImage(
  buffer: Buffer,
  contentType: string,
  puterToken: string | null
): Promise<string> {
  const mime = contentType || "image/png";
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  if (puterToken) {
    try {
      const result = await transcribeImageWithPuter(puterToken, dataUrl);
      if (result && result.trim()) {
        return result.trim();
      }
    } catch (error) {
      console.error(
        "[fileParser] Puter vision failed, falling back to OCR:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  return ocrImage(buffer);
}

export async function parseFileBuffer(
  buffer: Buffer,
  name: string,
  type: string,
  puterToken: string | null
): Promise<ParseResult> {
  const extension = (name.split(".").pop() || "").toLowerCase();
  const format = detectFormat(extension, type);

  switch (format) {
    case "text":
      return { text: buffer.toString("utf8"), format: "text" };

    case "csv": {
      const text = buffer.toString("utf8");
      const rows = parseCsv(text, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
      });
      return { text, format: "csv", rows };
    }

    case "pdf": {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return { text: result.text, format: "pdf" };
      } finally {
        await parser.destroy();
      }
    }

    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, format: "docx" };
    }

    case "xlsx": {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets: string[] = [];
      const rows: unknown[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        sheets.push(`[${sheetName}]\n${XLSX.utils.sheet_to_csv(sheet)}`);
        rows.push(...(XLSX.utils.sheet_to_json(sheet) as unknown[]));
      }
      return { text: sheets.join("\n\n"), format: "xlsx", rows };
    }

    case "pptx": {
      const zip = new AdmZip(buffer);
      const texts: string[] = [];
      for (const entry of zip.getEntries()) {
        if (/^ppt\/slides\/slide\d+\.xml$/.test(entry.entryName)) {
          const xml = entry.getData().toString("utf8");
          const matches = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)];
          if (matches.length > 0) {
            texts.push(matches.map((match) => match[1]).join(" "));
          }
        }
      }
      return { text: texts.join("\n\n"), format: "pptx" };
    }

    case "image": {
      const text = await transcribeImage(buffer, type, puterToken);
      return { text, format: "image" };
    }

    default:
      throw new Error(`Formato no soportado: ${extension || type || "desconocido"}`);
  }
}
