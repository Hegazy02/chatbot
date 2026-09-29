import multer from "multer";
import { MAX_UPLOAD_BYTES } from "../config.js";

export const uploadCvPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES }
});
