import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// CORS header middleware for local development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from 'public' folder
app.use(express.static("public"));


// Server-side fallback memory array
let serverChatHistory = [];

app.post("/api/chat", async (req, res) => {
  console.log("Request received");

  try {
    const { message, history } = req.body;

    // Use client-provided history if present, otherwise use server-side history
    let chatHistory = [];
    if (Array.isArray(history)) {
      chatHistory = history.map(item => ({
        role: item.role === "assistant" ? "assistant" : "user",
        content: item.content || item.text || ""
      }));
    } else {
      chatHistory = [...serverChatHistory];
    }

    const messagesPayload = [
      {
        role: "system",
        content: `
          You are a helpful AI assistant.
          Use the preceding conversation history to maintain full context and remember user details, facts, and preferences discussed earlier in the conversation.

          Always return your response as valid JSON.
          Do not include markdown or any text outside the JSON object.

          The JSON must have this structure:
          {
            "response": "string"
          }
        `,
      },
      ...chatHistory,
      {
        role: "user",
        content: message,
      },
    ];

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: messagesPayload,
      response_format: {
        type: "json_object",
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content);

    // Update server memory if server history is being tracked
    serverChatHistory.push({ role: "user", content: message });
    serverChatHistory.push({ role: "assistant", content: result.response });

    return res.json(result);

  } catch (error) {
    console.error("Groq error:", error);

    return res.status(500).json({
      success: false,
      error: "AI request failed",
      message: error.message,
    });
  }
});

app.post("/api/chat/clear", (req, res) => {
  serverChatHistory = [];
  return res.json({ success: true, message: "Server history reset" });
});


export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

