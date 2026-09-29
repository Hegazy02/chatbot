import OpenAI from "openai";
import { LLM } from "../config.js";

const client = new OpenAI({
  apiKey: LLM.apiKey,
  baseURL: LLM.baseURL
});

function stripOuterFence(text) {
  const fenced = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : text;
}

export async function askModel(messages) {
  const response = await client.chat.completions.create({
    model: LLM.model,
    messages,
    response_format: { type: "json_object" }
  });

  const { response: answer } = JSON.parse(response.choices[0].message.content);
  return stripOuterFence(answer ?? "");
}
