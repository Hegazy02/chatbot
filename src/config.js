import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = process.env.PORT || 3000;

export const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const JSON_BODY_LIMIT = "20mb";

export const LLM = {
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  model: "openai/gpt-oss-20b"
};

export const CHUNK_COUNT = 4;

export const TIME_FORMAT = { hour: "2-digit", minute: "2-digit" };
