let history = [];

export function getHistory() {
  return [...history];
}

export function appendExchange(userMessage, assistantMessage) {
  history.push({ role: "user", content: userMessage });
  history.push({ role: "assistant", content: assistantMessage });
}

export function clearHistory() {
  history = [];
}
