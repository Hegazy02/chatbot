import { Router } from "express";
import { uploadCvPdf } from "../middleware/upload.js";
import { extractTextFromPdf } from "../services/pdf.service.js";
import { splitCvIntoChunks } from "../services/chunk.service.js";
import { clearCv, getCvSummary, setCv } from "../store/cv.store.js";

const router = Router();

router.post("/upload-cv", uploadCvPdf.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF file uploaded" });
    }

    console.log(`Processing uploaded PDF CV: ${req.file.originalname}`);

    const rawText = await extractTextFromPdf(req.file.buffer);

    if (!rawText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Unable to extract readable text from the uploaded PDF."
      });
    }

    const chunks = await splitCvIntoChunks(rawText);
    const cv = setCv(req.file.originalname, rawText, chunks);

    console.log(`CV split into ${chunks.length} chunks successfully.`);

    return res.json({
      success: true,
      message: `CV uploaded successfully!`,
      filename: cv.filename,
      chunksCount: cv.chunks.length,
      chunks: cv.chunks,
      uploadTime: cv.uploadTime
    });
  } catch (err) {
    console.error("PDF upload error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process PDF file: " + err.message
    });
  }
});

router.post("/clear-cv", (req, res) => {
  clearCv();
  return res.json({ success: true, message: "Active CV memory cleared." });
});

router.get("/cv-status", (req, res) => {
  return res.json(getCvSummary() || { hasCv: false });
});

export default router;
