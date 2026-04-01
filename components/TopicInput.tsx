"use client";

import { useEffect, useRef, useState } from "react";
import { useDebateStore } from "@/lib/store";
import { WORKFLOWS, getWorkflow, type WorkflowId } from "@/lib/review-options";

interface TopicInputProps {
  workflowId?: WorkflowId;
}

export default function TopicInput({ workflowId }: TopicInputProps) {
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isStreaming, setTopic, addMessage, updateLastMessage, finishAgent, setStreaming, setActiveAgent, reset } =
    useDebateStore();
  const activeWorkflow = getWorkflow(workflowId) ?? WORKFLOWS[0];

  useEffect(() => {
    setInput(activeWorkflow.prompt);
  }, [activeWorkflow.id, activeWorkflow.prompt]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('파일 크기가 4MB를 초과합니다. 더 작은 파일을 선택해주세요.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        alert('서버 오류가 발생했습니다. 파일 형식을 확인하거나 다시 시도해주세요.\n\n' + text.slice(0, 200));
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "파일 업로드 실패");
        return;
      }
      setAttachedFile({ name: data.filename, text: data.text });
    } catch (err) {
      alert('파일 업로드 중 오류가 발생했습니다.\n\n가능한 원인:\n• 파일이 손상되었거나 암호로 보호됨\n• 파일 크기가 너무 큼\n• 네트워크 연결 문제\n\n다른 파일로 다시 시도해주세요.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || isStreaming) return;

    reset();

    // 토픽 구성: 텍스트 + 첨부파일
    let fullTopic = trimmed;
    if (attachedFile) {
      const fileSection = `\n\n---\n[첨부파일: ${attachedFile.name}]\n${attachedFile.text}`;
      fullTopic = trimmed ? trimmed + fileSection : `첨부파일 분석 요청\n${fileSection}`;
    }

    setTopic(trimmed || attachedFile?.name || "첨부파일 점검");
    setStreaming(true);

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: fullTopic }),
      });

      if (!res.ok || !res.body) throw new Error("스트리밍 연결 실패");

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
              if (data.agent && data.content !== undefined) {
                if (data.type === "start") {
                  setActiveAgent(data.agent);
                  addMessage({ agent: data.agent, content: "", done: false });
                } else if (data.type === "chunk") {
                  updateLastMessage(data.agent, data.content);
                } else if (data.type === "done") {
                  finishAgent(data.agent);
                  setActiveAgent(null);
                }
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      console.error("Debate error:", err);
    } finally {
      setStreaming(false);
      setActiveAgent(null);
      setAttachedFile(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">Review kickoff</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {activeWorkflow.title} 플로우를 기준으로 프롬프트를 준비했습니다. 그대로 쓰거나 수정해서 시작하면 됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {WORKFLOWS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setInput(preset.prompt)}
              disabled={isStreaming}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                activeWorkflow.id === preset.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                  : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              attachedFile
                ? `📎 ${attachedFile.name} 첨부됨 — 어떤 점을 검토할지 한 줄로 적어주세요`
                : activeWorkflow.prompt
            }
            disabled={isStreaming}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-3.5 pr-12 text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none transition-all focus:border-omega focus:ring-1 focus:ring-omega/50 disabled:opacity-50"
          />
          {/* 파일 첨부 버튼 */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isStreaming || uploading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-omega transition-colors disabled:opacity-30"
            title="파일 첨부 (PDF, DOCX, TXT, CSV)"
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
          disabled={isStreaming || (!input.trim() && !attachedFile)}
          className="rounded-xl bg-omega px-6 py-3.5 font-semibold text-white transition-all hover:bg-omega/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <span className="flex items-center gap-2">
              <span className="pulse-dot bg-white" />
              점검 중...
            </span>
          ) : (
            "점검 시작"
          )}
        </button>
      </div>
      {/* 첨부파일 표시 */}
      {attachedFile && !isStreaming && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-3 py-2 text-sm">
          <span>📎</span>
          <span className="text-[var(--text-primary)]">{attachedFile.name}</span>
          <span className="text-[var(--text-secondary)]">({(attachedFile.text.length / 1000).toFixed(1)}K자)</span>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="ml-auto text-[var(--text-secondary)] hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
      {!attachedFile && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          지원 형식: PDF, DOCX, TXT, MD, CSV. 파일만 업로드해도 에이전트가 문맥을 읽고 점검합니다.
        </p>
      )}
    </form>
  );
}
