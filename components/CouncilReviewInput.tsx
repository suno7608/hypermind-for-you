"use client";

import { useRef, useState } from "react";
import { useDebateStore } from "@/lib/store";

const AGENT_ORDER = ["omega", "psi", "arbiter", "delta"];

export default function CouncilReviewInput({ userPin }: { userPin?: string | null }) {
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5-20250929");
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isStreaming, setTopic, addMessage, updateLastMessage, finishAgent, setStreaming, setActiveAgent, reset } =
    useDebateStore();

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "파일 업로드 실패");
        return;
      }
      setAttachedFile({ name: data.filename, text: data.text });
    } catch (err) {
      setError("파일 업로드 중 오류: " + err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();

    if ((!trimmed && !attachedFile) || isStreaming) return;
    if (!password.trim()) {
      setError("최종 검증 비밀번호를 입력하세요.");
      return;
    }

    reset();
    setError(null);

    let fullTopic = trimmed;
    if (attachedFile) {
      const fileSection = `\n\n---\n[첨부파일: ${attachedFile.name}]\n${attachedFile.text}`;
      fullTopic = trimmed ? trimmed + fileSection : `첨부파일 기반 최종 검증 요청\n${fileSection}`;
    }

    setTopic(trimmed || attachedFile?.name || "Council 최종 검증");
    setStreaming(true);

    try {
      // Call each agent individually to stay within Vercel 60s timeout
      const prev: Record<string, string> = {};

      for (const agentId of AGENT_ORDER) {
        setActiveAgent(agentId);
        addMessage({ agent: agentId, content: "", done: false });

        const res = await fetch("/api/debate/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, topic: fullTopic, prev, password, model: selectedModel }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `${agentId} 연결 실패`);
        }
        if (!res.body) throw new Error("스트리밍 연결 실패");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                fullContent += data.text;
                updateLastMessage(agentId, fullContent);
              }
            } catch (err) {
              if (err instanceof Error && err.message !== "done") throw err;
            }
          }
        }

        prev[agentId] = fullContent;
        finishAgent(agentId);
        setActiveAgent(null);
      }

      // Save to DB via the original debate endpoint (quick, non-streaming)
      try {
        await fetch("/api/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: fullTopic, password, model: selectedModel, saveOnly: true, userPin: userPin || undefined, agents: Object.entries(prev).map(([agent, content]) => ({ agent, content, done: true })) }),
        });
      } catch { /* DB save is best-effort */ }

    } catch (err) {
      console.error("Council review error:", err);
      setError(String(err));
    } finally {
      setStreaming(false);
      setActiveAgent(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="flex-1">
          <p className="eyebrow">Council final review</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
            4명의 에이전트가 순차적으로 점검하는 고비용 최종 검증입니다. 승인된 사람만 실행할 수 있도록 비밀번호가 필요합니다.
          </p>
        </div>
        <div className="flex w-full gap-3 lg:w-auto">
          <div className="flex-1 lg:w-[200px]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="최종 검증 비밀번호"
              disabled={isStreaming}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>
          <div className="w-[160px]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(event) => {
                const val = event.target.value;
                if (val.includes("opus") && !password.trim()) {
                  setError("Opus 모델을 사용하려면 비밀번호를 먼저 입력하세요.");
                  return;
                }
                setSelectedModel(val);
              }}
              disabled={isStreaming}
              className="w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              <option value="claude-sonnet-4-5-20250929">⚡ Sonnet 4.5</option>
              <option value="claude-opus-4-0-20250514">🧠 Opus 4 🔒</option>
            </select>
            <p className="mt-1.5 text-[10px] leading-tight text-[var(--text-secondary)] opacity-70">
              {selectedModel.includes("sonnet") ? "빠르고 효율적인 일반 리뷰" : "깊고 정밀한 최종 검증 (비밀번호 필요)"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              attachedFile
                ? `📎 ${attachedFile.name} 첨부됨 — 최종 검증에서 확인할 쟁점을 적어주세요`
                : "예: 이 발표 자료를 최종 검증해줘. 반박 가능성과 빠진 근거를 중심으로 봐줘"
            }
            disabled={isStreaming}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-3.5 pr-12 text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none transition-all focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isStreaming || uploading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)] disabled:opacity-30"
            title="파일 첨부"
          >
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
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.pptx,.ppt,.txt,.md,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <button
          type="submit"
          disabled={isStreaming || (!input.trim() && !attachedFile) || !password.trim()}
          className="brand-button justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStreaming ? "Council 검증 중..." : "Council 최종 검증 시작"}
        </button>
      </div>

      {attachedFile && !isStreaming && (
        <div className="flex items-center gap-2 rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 text-sm">
          <span>📎</span>
          <span className="text-[var(--text-primary)]">{attachedFile.name}</span>
          <span className="text-[var(--text-secondary)]">({(attachedFile.text.length / 1000).toFixed(1)}K자)</span>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="ml-auto text-[var(--text-secondary)] transition-colors hover:text-red-500"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </form>
  );
}
