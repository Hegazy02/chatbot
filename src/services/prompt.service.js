function formatChunks(chunks) {
  return chunks
    .map((chunkText, idx) => `[ CHUNK ${idx + 1} OF ${chunks.length} ]:\n${chunkText}`)
    .join("\n\n---\n\n");
}

export function buildCvGroundedPrompt(cv) {
  return `
    You are a specialized AI Resume Consultant & CV Analyst.
    The user has uploaded a candidate's CV named "${cv.filename}".
    The CV has been split using LangChain into ${cv.chunks.length} distinct chunks below:

    ========== START CV CHUNKS ==========
    ${formatChunks(cv.chunks)}
    ========== END CV CHUNKS ==========

    CRITICAL GROUNDING & ANSWERING INSTRUCTIONS:
    1. **Strict CV Grounding**: Answer all questions regarding the candidate's skills, work experience, responsibilities, projects, education, and achievements STRICTLY based on the provided CV chunks.
    2. **CV Enhancement**: If the user asks how to ENHANCE, IMPROVE, REWRITE, or OPTIMIZE this CV, analyze the ${cv.chunks.length} chunks and provide concrete, professional, and actionable recommendations (e.g., adding quantifiable metrics, formatting advice, missing skills, career summary improvements).
    3. **Out of Scope Handling**: If the user asks a question completely unrelated to the candidate or CV (e.g. cooking, general weather, unrelated trivia), politely reply: "I am currently set to analyze the uploaded CV (${cv.filename}). Please ask questions related to this candidate's resume or how to enhance it!"
    4. **Output Format**: Always return your response as valid JSON with structure:
       {
         "response": "string formatted in clean Markdown"
       }
    5. **No Outer Code Fence**: The "response" value must contain the Markdown itself. Never wrap the whole answer in \`\`\`markdown ... \`\`\` fences, and never start it with a backtick. Use fenced code blocks ONLY for small, genuinely verbatim snippets.
  `;
}

export function buildDefaultPrompt() {
  return `
    You are a helpful AI assistant.
    Use the preceding conversation history to maintain full context and remember user details.

    Always return your response as valid JSON with structure:
    {
      "response": "string"
    }
  `;
}

export function buildSystemPrompt(cv) {
  return cv && cv.chunks.length > 0 ? buildCvGroundedPrompt(cv) : buildDefaultPrompt();
}
