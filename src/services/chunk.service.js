import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CHUNK_COUNT } from "../config.js";

async function splitWithLangChain(rawText) {
  const cleanText = rawText.replace(/\r\n/g, "\n").trim();
  if (!cleanText) return [];

  const targetChunkSize = Math.max(150, Math.ceil(cleanText.length / CHUNK_COUNT));
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: targetChunkSize,
    chunkOverlap: 0,
    separators: ["\n\n", "\n", ". ", " ", ""]
  });

  return splitter.splitText(cleanText);
}

function mergeShortestNeighbours(chunks) {
  while (chunks.length > CHUNK_COUNT) {
    let minIndex = 0;
    let minCombinedLen = Infinity;

    for (let i = 0; i < chunks.length - 1; i++) {
      const combinedLen = chunks[i].length + chunks[i + 1].length;
      if (combinedLen < minCombinedLen) {
        minCombinedLen = combinedLen;
        minIndex = i;
      }
    }

    chunks[minIndex] = chunks[minIndex] + "\n" + chunks[minIndex + 1];
    chunks.splice(minIndex + 1, 1);
  }
}

function splitLongestChunk(chunks) {
  while (chunks.length < CHUNK_COUNT && chunks.length > 0) {
    let maxIndex = 0;
    let maxLen = 0;

    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].length > maxLen) {
        maxLen = chunks[i].length;
        maxIndex = i;
      }
    }

    if (maxLen < 40) break;

    const half = Math.floor(chunks[maxIndex].length / 2);
    const splitPoint = chunks[maxIndex].indexOf(" ", half);
    const actualSplit = splitPoint !== -1 ? splitPoint : half;

    const firstHalf = chunks[maxIndex].substring(0, actualSplit).trim();
    const secondHalf = chunks[maxIndex].substring(actualSplit).trim();

    chunks.splice(maxIndex, 1, firstHalf, secondHalf);
  }
}

export async function splitCvIntoChunks(rawText) {
  const chunks = await splitWithLangChain(rawText);

  mergeShortestNeighbours(chunks);
  splitLongestChunk(chunks);

  return chunks;
}
