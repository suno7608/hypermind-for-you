"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { AGENTS } from "@/lib/agents";
import { downloadChat, downloadSingleAgent } from "@/lib/download";
import { extractTextFromFile } from "@/lib/file-extract";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AgentChatProps {
  agentId: string;
  sessionId: string | null;
  onClose: () => void;
  onNewSession: (id: string) => void;
  onSaved: () => void;
  initialPrompt?: string;
  emptyStateText?: string;
  inputPlaceholder?: string;
  closeLabel?: string;
  userPin?: string | null;
}

export default function AgentChat({
  agentId,
  sessionId,
  onClose,
  onNewSession,
  onSaved,
  initialPrompt,
  emptyStateText,
  inputPlaceholder,
  closeLabel = "← 돌아가기",
  userPin,
}: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5-20250929");
  const [chatId, setChatId] = useState<string>(sessionId || Math.random().toString(36).slice(2) + Date.now().toString(36));
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const agent = AGENTS.find((a) => a.id === agentId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load existing session or reset
  useEffect(() => {
    if (sessionId) {
      setChatId(sessionId);
      fetch(`/api/agent-chats?agentId=${agentId}`)
        .then((r) => r.json())
        .then((chats) => {
          const found = chats.find((c: any) => c.id === sessionId);
          if (found) setMessages(JSON.parse(found.messages));
        })
        .catch(() => {});
    } else {
      const newId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      setChatId(newId);
      setMessages([]);
      setInput(initialPrompt || "");
      setAttachedFile(null);
      onNewSession(newId);
    }
  }, [agentId, initialPrompt, onNewSession, sessionId]);

  const saveChat = useCallback(async (msgs: ChatMessage[], id: string) => {
    const title = msgs.find((m) => m.role === "user")?.content.slice(0, 50) || "리뷰";
    await fetch("/api/agent-chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, agentId, title, messages: msgs, userPin: userPin || undefined }),
    });
    onSaved();
  }, [agentId, onSaved]);

  if (!agent) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await extractTextFromFile(file);
      setAttachedFile({ name: result.filename, text: result.text });
    } catch (err) {
      alert(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.');
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || streaming) return;

    let userContent = trimmed;
    if (attachedFile) {
      const fileSection = `\n\n---\n[첨부파일: ${attachedFile.name}]\n${attachedFile.text}`;
      userContent = trimmed ? trimmed + fileSection : `첨부파일 분석 요청\n${fileSection}`;
    }

    const userMsg: ChatMessage = { role: "user", content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
    setAttachedFile(null);
    setStreaming(true);

    let fullContent = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: newMessages,
          model: selectedModel,
          ...(selectedModel.includes("opus") ? { password: sessionStorage.getItem("opusPw") } : {}),
        }),
      });
      if (!res.ok || !res.body) throw new Error("연결 실패");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullContent += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: fullContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      fullContent = "⚠️ 응답 중 오류가 발생했습니다.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: fullContent };
        return updated;
      });
    } finally {
      setStreaming(false);
      // Save to DB
      const finalMessages = [...newMessages, { role: "assistant" as const, content: fullContent }];
      setMessages(finalMessages);
      await saveChat(finalMessages, chatId);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4"
        style={{ borderBottomColor: agent.color + "44" }}>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold text-white"
          style={{ backgroundColor: agent.color }}>{agent.icon}</span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{agent.name}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{agent.role} — 1:1 리뷰</p>
        </div>
        { messages.length > 1 && !streaming && (
          <button onClick={() => downloadChat(agentId, messages)}

            className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors flex items-center gap-1"
            title="리뷰 다운로드">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            다운로드
          </button>
        )}
        <button onClick={() => { const newId = Math.random().toString(36).slice(2) + Date.now().toString(36); setChatId(newId); setMessages([]); onNewSession(newId); }}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors mr-2">
          + 새 세션
        </button>
        <button onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
          {closeLabel}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-secondary)]">
            <span className="text-5xl opacity-20">{agent.icon}</span>
            <p className="text-sm">{emptyStateText || `${agent.name}에게 발표 초안, 문장, 사업 고민을 바로 점검받을 수 있습니다`}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`group/msg relative max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user" ? "bg-omega/20 text-[var(--text-primary)]"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              }`} style={msg.role === "assistant" ? { borderLeft: `3px solid ${agent.color}` } : {}}>
              {msg.role === "assistant" && msg.content && !streaming && (
                <button
                  onClick={() => downloadSingleAgent(agentId, msg.content)}
                  title="이 답변 다운로드"
                  className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all p-1"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}
              {msg.role === "assistant" ? (
                <div className="prose max-w-none">
                  <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                </div>
              ) : ( <span>{msg.content.length > 200 ? msg.content.slice(0, 200) + "..." : msg.content}</span> )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-[var(--border)] px-6 py-4">
        <div className="mb-2 flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => {
              const val = e.target.value;
              if (val.includes("opus")) {
                // Already verified this session
                if (sessionStorage.getItem("opusPw")) {
                  setSelectedModel(val);
                  return;
                }
                const pw = prompt("Opus 모델은 고급 사양입니다. 비밀번호를 입력하세요:");
                if (!pw) return; // 취소 누르면 변경 안 함
                fetch("/api/debate/verify-model", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password: pw }),
                }).then(r => {
                  if (r.ok) {
                    sessionStorage.setItem("opusPw", pw);
                    setSelectedModel(val);
                  } else {
                    alert("비밀번호가 틀렸습니다.");
                  }
                });
                return;
              }
              setSelectedModel(val);
            }}
            disabled={streaming}
            className="appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="claude-sonnet-4-5-20250929">⚡ Sonnet 4.5</option>
            <option value="claude-opus-4-0-20250514">🧠 Opus 4 🔒</option>
          </select>
          <span className="text-[10px] text-[var(--text-secondary)] opacity-60">
            {selectedModel.includes("sonnet") ? "빠르고 효율적인 일반 리뷰" : "깊고 정밀한 최종 검증 🔓"}
          </span>
        </div>
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-3 py-2 text-sm">
            <span>📎</span>
            <span className="text-[var(--text-primary)]">{attachedFile.name}</span>
            <span className="text-[var(--text-secondary)]">({(attachedFile.text.length / 1000).toFixed(1)}K자)</span>
            <button type="button" onClick={() => setAttachedFile(null)}
              className="ml-auto text-[var(--text-secondary)] hover:text-red-400 transition-colors">✕</button>
          </div>
        )}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={attachedFile ? `📎 ${attachedFile.name} 첨부됨` : inputPlaceholder || `${agent.name}에게 어떤 점을 검토받을지 적어주세요`}
              disabled={streaming}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-3 pr-12 text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-omega focus:ring-1 focus:ring-omega/50 disabled:opacity-50" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={streaming || uploading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-omega transition-colors disabled:opacity-30"
              title="파일 첨부">
              {uploading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.ppt,.txt,.md,.csv" onChange={handleFileChange} className="hidden" />
          </div>
          <button type="submit" disabled={streaming || (!input.trim() && !attachedFile)}
            className="rounded-xl px-5 py-3 font-semibold text-white transition-all hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: agent.color }}>
            {streaming ? "..." : "리뷰 요청"}
          </button>
        </div>
      </form>
    </div>
  );
}
