import { Router } from "express";
import { askModel } from "../services/llm.service.js";
import { buildSystemPrompt } from "../services/prompt.service.js";
import { getCv } from "../store/cv.store.js";
import { appendExchange, clearHistory, getHistory } from "../store/chat.store.js";

const router = Router();

function resolveChatHistory(incoming) {
  if (!Array.isArray(incoming)) return getHistory();

  return incoming.map((item) => ({
    role: item.role === "assistant" ? "assistant" : "user",
    content: item.content || item.text || ""
  }));
}

router.post("/chat", async (req, res) => {
  console.log("Request received for /api/chat");

  try {
    const { message, history } = req.body;

    const answer = await askModel([
      { role: "system", content: buildSystemPrompt(getCv()) },
      ...resolveChatHistory(history),
      { role: "user", content: message }
    ]);

    appendExchange(message, answer);

    return res.json({ response: answer });
  } catch (error) {
    console.error("Groq error:", error);

    return res.status(500).json({
      success: false,
      error: "AI request failed",
      message: error.message
    });
  }
});

router.post("/chat/clear", (req, res) => {
  clearHistory();
  return res.json({ success: true, message: "Server history reset" });
});

export default router;
