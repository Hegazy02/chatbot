document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
  const chatMessages = document.getElementById("chat-messages");
  const chatViewport = document.getElementById("chat-viewport");
  const welcomeState = document.getElementById("welcome-state");
  const typingIndicator = document.getElementById("typing-indicator");
  const errorBanner = document.getElementById("error-banner");
  const errorMessage = document.getElementById("error-message");
  const dismissErrorBtn = document.getElementById("dismiss-error");
  const charCount = document.getElementById("char-count");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const clearChatHeaderBtn = document.getElementById("clear-chat-header-btn");
  const exportChatBtn = document.getElementById("export-chat-btn");
  const newChatBtn = document.getElementById("new-chat-btn");
  const openSidebarBtn = document.getElementById("open-sidebar-btn");
  const closeSidebarBtn = document.getElementById("close-sidebar-btn");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const promptChips = document.querySelectorAll(".prompt-chip");

  // PDF Upload Elements
  const cvFileInput = document.getElementById("cv-file-input");
  const uploadCvSidebarBtn = document.getElementById("upload-cv-sidebar-btn");
  const uploadCvHeaderBtn = document.getElementById("upload-cv-header-btn");
  const welcomeUploadBtn = document.getElementById("welcome-upload-btn");
  const inputUploadBtn = document.getElementById("input-upload-btn");
  
  // Active CV Badges
  const sidebarCvCard = document.getElementById("sidebar-cv-card");
  const sidebarCvName = document.getElementById("sidebar-cv-name");
  const sidebarUnloadCvBtn = document.getElementById("sidebar-unload-cv-btn");
  const headerCvBadge = document.getElementById("header-cv-badge");
  const headerCvFilename = document.getElementById("header-cv-filename");
  const inputCvStatus = document.getElementById("input-cv-status");
  const inputCvFilename = document.getElementById("input-cv-filename");
  const inputUnloadCvBtn = document.getElementById("input-unload-cv-btn");

  // API Endpoints
  const API_URL = "/api/chat";
  const UPLOAD_URL = "/api/upload-cv";
  const CLEAR_CV_URL = "/api/clear-cv";
  const STATUS_CV_URL = "/api/cv-status";

  // Application State
  let messages = loadMessagesFromStorage();
  let isGenerating = false;
  let activeCvState = null;

  // Initialize marked options for code rendering
  if (window.marked) {
    marked.setOptions({
      highlight: function (code, lang) {
        if (window.hljs && lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return code;
      },
      breaks: true,
      gfm: true
    });
  }

  // Initial UI Setup & Server Status Sync
  renderAllMessages();
  updateHistorySidebar();
  checkServerCvStatus();

  // --- Event Listeners ---

  // Auto-resize input textarea
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
    
    const count = userInput.value.length;
    charCount.textContent = `${count} / 2000`;
    if (count > 2000) {
      charCount.classList.add("text-red-400");
    } else {
      charCount.classList.remove("text-red-400");
    }
  });

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Send button click
  sendBtn.addEventListener("click", handleSendMessage);

  // PDF Upload Trigger Buttons
  [uploadCvSidebarBtn, uploadCvHeaderBtn, welcomeUploadBtn, inputUploadBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener("click", () => cvFileInput.click());
    }
  });

  // File Input Change (Upload PDF)
  cvFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      handlePdfUpload(file);
    }
  });

  // Unload CV Buttons
  [sidebarUnloadCvBtn, inputUnloadCvBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener("click", handleUnloadCv);
    }
  });

  // Prompt chip click handlers
  promptChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const promptText = chip.querySelector("h3")?.textContent.replace("★ ", "") || 
                         chip.querySelector("p")?.textContent || "";
      if (promptText) {
        userInput.value = promptText;
        userInput.dispatchEvent(new Event("input"));
        handleSendMessage();
      }
    });
  });

  // Clear chat buttons
  clearHistoryBtn.addEventListener("click", clearChatHistory);
  clearChatHeaderBtn.addEventListener("click", clearChatHistory);
  newChatBtn.addEventListener("click", clearChatHistory);

  // Export chat button
  exportChatBtn.addEventListener("click", exportChat);

  // Dismiss Error Toast
  dismissErrorBtn.addEventListener("click", hideError);

  // Mobile Sidebar Toggle
  openSidebarBtn.addEventListener("click", toggleSidebar);
  closeSidebarBtn.addEventListener("click", toggleSidebar);
  sidebarOverlay.addEventListener("click", toggleSidebar);

  // --- PDF Upload & CV RAG Logic ---

  async function handlePdfUpload(file) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showError("Invalid file type. Please upload a valid .PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    hideError();
    setGeneratingState(true, "// PARSING PDF & SPLITTING INTO 4 LANGCHAIN CHUNKS...");

    try {
      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to parse PDF CV.");
      }

      // Update active CV state
      activeCvState = {
        filename: data.filename,
        chunksCount: data.chunksCount
      };

      updateCvStatusBadges();

      // Append System Notification Message into chat
      const systemNotice = {
        role: "assistant",
        text: `📄 **CV LOADED & SPLIT INTO 4 CHUNKS**\n\n- **File Name**: \`${data.filename}\`\n- **Chunk Strategy**: LangChain Recursive Character Splitter (${data.chunksCount} chunks)\n- **Grounding Mode**: Active! I am now strictly grounded in this CV. Ask me about the candidate's skills, experience, or **how to enhance this CV**!`,
        time: getCurrentTimeStr()
      };
      
      messages.push(systemNotice);
      saveMessagesToStorage();
      renderSingleMessage(systemNotice);
      updateWelcomeState();
      scrollToBottom();

    } catch (err) {
      console.error("Upload error:", err);
      showError(`PDF Upload Error: ${err.message}`);
    } finally {
      setGeneratingState(false);
      cvFileInput.value = ""; // Reset file input
    }
  }

  async function handleUnloadCv() {
    try {
      await fetch(CLEAR_CV_URL, { method: "POST" });
    } catch (e) {
      console.warn("Error clearing CV on server:", e);
    }

    activeCvState = null;
    updateCvStatusBadges();
  }

  async function checkServerCvStatus() {
    try {
      const res = await fetch(STATUS_CV_URL);
      const data = await res.json();
      if (data.hasCv) {
        activeCvState = {
          filename: data.filename,
          chunksCount: data.chunksCount
        };
        updateCvStatusBadges();
      }
    } catch (e) {
      // Ignore initial status fetch errors
    }
  }

  function updateCvStatusBadges() {
    if (activeCvState) {
      if (sidebarCvCard) {
        sidebarCvName.textContent = activeCvState.filename;
        sidebarCvCard.classList.remove("hidden");
      }
      if (headerCvBadge) {
        headerCvFilename.textContent = activeCvState.filename;
        headerCvBadge.classList.remove("hidden");
      }
      if (inputCvStatus) {
        inputCvFilename.textContent = activeCvState.filename;
        inputCvStatus.classList.remove("hidden");
      }
    } else {
      if (sidebarCvCard) sidebarCvCard.classList.add("hidden");
      if (headerCvBadge) headerCvBadge.classList.add("hidden");
      if (inputCvStatus) inputCvStatus.classList.add("hidden");
    }
  }

  // --- Core Messaging Logic ---

  async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text || isGenerating) return;

    if (text.length > 2000) {
      showError("Message exceeds 2000 character limit.");
      return;
    }

    hideError();

    // Reset textarea
    userInput.value = "";
    userInput.style.height = "auto";
    charCount.textContent = "0 / 2000";

    // Add User Message to State
    const timeStr = getCurrentTimeStr();
    const userMsg = { role: "user", text, time: timeStr };
    messages.push(userMsg);
    saveMessagesToStorage();

    // Render User Message & Scroll
    renderSingleMessage(userMsg);
    updateWelcomeState();
    scrollToBottom();

    // Set Loading State
    setGeneratingState(true);

    try {
      const historyPayload = messages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.text
      }));

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.response || "No response content received.";
      
      const assistantMsg = { role: "assistant", text: aiReply, time: getCurrentTimeStr() };
      messages.push(assistantMsg);
      saveMessagesToStorage();

      renderSingleMessage(assistantMsg);
      updateHistorySidebar();

    } catch (err) {
      console.error("Chat Error:", err);
      showError(`API Request Failed: ${err.message || "Is your server running?"}`);
    } finally {
      setGeneratingState(false);
      scrollToBottom();
    }
  }

  function renderAllMessages() {
    chatMessages.innerHTML = "";
    updateWelcomeState();

    if (messages.length === 0) return;

    messages.forEach(msg => renderSingleMessage(msg));
    scrollToBottom();
  }

  function renderSingleMessage(msg) {
    const isUser = msg.role === "user";
    const msgWrapper = document.createElement("div");
    msgWrapper.className = `flex items-start space-x-3 animate-slide-up ${isUser ? "justify-end" : "justify-start"}`;

    if (isUser) {
      msgWrapper.innerHTML = `
        <div class="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <div class="flex items-center space-x-2 mb-1">
            <span class="font-mono text-[10px] font-black text-cyan-300 bg-blue-950 border border-blue-600 px-1.5 py-0.5">[ YOU ]</span>
            <span class="font-mono text-[10px] text-blue-300/70">${msg.time}</span>
          </div>
          <div class="max-card bg-[#11244d] text-white p-4 border-2 border-blue-500 shadow-[4px_4px_0px_0px_#1e3a8a] text-sm leading-relaxed whitespace-pre-wrap font-sans">
            ${escapeHtml(msg.text)}
          </div>
        </div>
        <div class="w-9 h-9 bg-blue-600 border-2 border-blue-300 flex items-center justify-center shrink-0 shadow-[3px_3px_0px_0px_#1e3a8a]">
          <i class="fa-solid fa-user text-xs text-white"></i>
        </div>
      `;
    } else {
      const formattedHtml = formatMarkdown(msg.text);

      msgWrapper.innerHTML = `
        <div class="w-9 h-9 bg-blue-600 border-2 border-blue-300 flex items-center justify-center shrink-0 shadow-[3px_3px_0px_0px_#1e3a8a]">
          <i class="fa-solid fa-robot text-xs text-white"></i>
        </div>
        <div class="flex flex-col items-start max-w-[90%] sm:max-w-[85%]">
          <div class="flex items-center space-x-2 mb-1">
            <span class="font-mono text-[10px] font-black text-yellow-300 bg-blue-950 border border-blue-600 px-1.5 py-0.5">[ AI BOT ]</span>
            <span class="font-mono text-[10px] text-blue-300/70">${msg.time}</span>
          </div>
          <div class="max-card p-4 text-sm text-slate-100 border-2 border-blue-600 shadow-[5px_5px_0px_0px_#1e3a8a] markdown-body w-full">
            ${formattedHtml}
          </div>
          <div class="flex items-center space-x-3 mt-2 px-1">
            <button class="copy-text-btn font-mono text-[11px] font-bold text-blue-300 hover:text-white bg-blue-950 border border-blue-600 px-2 py-0.5 flex items-center space-x-1" data-text="${escapeHtml(msg.text)}">
              <i class="fa-regular fa-copy"></i>
              <span>COPY TEXT</span>
            </button>
          </div>
        </div>
      `;
    }

    chatMessages.appendChild(msgWrapper);

    // Code block copy listeners
    if (!isUser) {
      const copyBtns = msgWrapper.querySelectorAll(".copy-btn");
      copyBtns.forEach(btn => {
        btn.addEventListener("click", () => {
          const preElement = btn.closest(".code-block-container")?.querySelector("code");
          if (preElement) {
            copyToClipboard(preElement.textContent, btn);
          }
        });
      });

      const copyTextBtn = msgWrapper.querySelector(".copy-text-btn");
      if (copyTextBtn) {
        copyTextBtn.addEventListener("click", () => {
          const textToCopy = copyTextBtn.getAttribute("data-text");
          copyToClipboard(textToCopy, copyTextBtn);
        });
      }
    }
  }

  function formatMarkdown(text) {
    if (!window.marked) return escapeHtml(text);

    let parsedHtml = marked.parse(text);

    const parser = new DOMParser();
    const doc = parser.parseFromString(parsedHtml, "text/html");

    const pres = doc.querySelectorAll("pre");
    pres.forEach(pre => {
      const code = pre.querySelector("code");
      const langClass = code ? Array.from(code.classList).find(c => c.startsWith("language-")) : "";
      const lang = langClass ? langClass.replace("language-", "") : "code";

      const wrapper = doc.createElement("div");
      wrapper.className = "code-block-container my-3 rounded-xl overflow-hidden border border-blue-900/50 bg-[#081229]";
      
      const header = doc.createElement("div");
      header.className = "code-header font-mono";
      header.innerHTML = `
        <span class="text-xs text-cyan-300 font-semibold uppercase">${lang}</span>
        <button class="copy-btn">
          <i class="fa-regular fa-copy"></i>
          <span>Copy code</span>
        </button>
      `;

      wrapper.appendChild(header);
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
    });

    return doc.body.innerHTML;
  }

  function setGeneratingState(generating, customText) {
    isGenerating = generating;
    sendBtn.disabled = generating;

    const labelEl = typingIndicator.querySelector("span:last-child");
    if (labelEl && customText) {
      labelEl.textContent = customText;
    } else if (labelEl) {
      labelEl.textContent = "// ANALYZING CV CHUNKS & COMPUTING ANSWER...";
    }

    if (generating) {
      typingIndicator.classList.remove("hidden");
      sendBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-xs"></i>`;
    } else {
      typingIndicator.classList.add("hidden");
      sendBtn.innerHTML = `<span>SEND</span><i class="fa-solid fa-paper-plane text-xs ml-1.5"></i>`;
    }
  }

  function updateWelcomeState() {
    if (messages.length === 0) {
      welcomeState.classList.remove("hidden");
      chatMessages.classList.add("hidden");
    } else {
      welcomeState.classList.add("hidden");
      chatMessages.classList.remove("hidden");
    }
  }

  function updateHistorySidebar() {
    const historyList = document.getElementById("chat-history-list");
    const existingItems = historyList.querySelectorAll(".history-item");
    existingItems.forEach(item => item.remove());

    const emptyState = document.getElementById("history-empty");

    if (messages.length === 0) {
      if (emptyState) emptyState.classList.remove("hidden");
      return;
    }

    if (emptyState) emptyState.classList.add("hidden");

    const userMessages = messages.filter(m => m.role === "user");
    userMessages.slice(-5).reverse().forEach(m => {
      const item = document.createElement("div");
      item.className = "history-item max-card p-2.5 text-xs font-mono text-blue-200 hover:text-white cursor-pointer flex items-center space-x-2 truncate border border-blue-600 hover:border-cyan-400 bg-[#0c1834]";
      item.innerHTML = `
        <i class="fa-solid fa-terminal text-cyan-400 text-xs shrink-0"></i>
        <span class="truncate font-bold">${escapeHtml(m.text)}</span>
      `;
      historyList.appendChild(item);
    });
  }

  function clearChatHistory() {
    messages = [];
    saveMessagesToStorage();
    renderAllMessages();
    updateHistorySidebar();
    hideError();

    fetch("/api/chat/clear", { method: "POST" }).catch(() => {});
  }

  function exportChat() {
    if (messages.length === 0) {
      showError("No chat history available to export.");
      return;
    }

    let exportText = `# AI CV Session Export\nDate: ${new Date().toLocaleString()}\nActive CV: ${activeCvState?.filename || 'None'}\n\n---\n\n`;
    messages.forEach(m => {
      const sender = m.role === "user" ? "User" : "AI Assistant";
      exportText += `### **${sender}** (${m.time})\n${m.text}\n\n`;
    });

    const blob = new Blob([exportText], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cv-chat-export-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
      const originalHTML = buttonEl.innerHTML;
      buttonEl.innerHTML = `<i class="fa-solid fa-check text-emerald-400"></i> <span class="text-emerald-400">COPIED!</span>`;
      setTimeout(() => {
        buttonEl.innerHTML = originalHTML;
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBanner.classList.remove("hidden");
  }

  function hideError() {
    errorBanner.classList.add("hidden");
  }

  function toggleSidebar() {
    sidebar.classList.toggle("-translate-x-full");
    sidebarOverlay.classList.toggle("hidden");
  }

  function scrollToBottom() {
    setTimeout(() => {
      chatViewport.scrollTop = chatViewport.scrollHeight;
    }, 50);
  }

  function getCurrentTimeStr() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function saveMessagesToStorage() {
    try {
      localStorage.setItem("chatbot_messages", JSON.stringify(messages));
    } catch (e) {
      console.warn("LocalStorage save failed:", e);
    }
  }

  function loadMessagesFromStorage() {
    try {
      const stored = localStorage.getItem("chatbot_messages");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});
