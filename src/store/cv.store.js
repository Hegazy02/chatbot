import { TIME_FORMAT } from "../config.js";

let activeCv = null;

export function getCv() {
  return activeCv;
}

export function setCv(filename, rawText, chunks) {
  activeCv = {
    filename,
    rawText,
    chunks,
    uploadTime: new Date().toLocaleTimeString([], TIME_FORMAT)
  };
  return activeCv;
}

export function clearCv() {
  activeCv = null;
}

export function getCvSummary() {
  if (!activeCv) return null;

  return {
    hasCv: true,
    filename: activeCv.filename,
    chunksCount: activeCv.chunks.length,
    chunks: activeCv.chunks,
    uploadTime: activeCv.uploadTime
  };
}
