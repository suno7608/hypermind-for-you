"use client";

import { useEffect, useRef, useState } from "react";
import { useDebateStore } from "@/lib/store";
import { WORKFLOWS, getWorkflow, type WorkflowId } from "@/lib/review-options";
import { processFile, type ProcessedFile } from "@/lib/file-extract";

interface TopicInputProps {
  workflowId?: WorkflowId;
}

export default function TopicInput({ workflowId }: TopicInputProps) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<ProcessedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isStreaming, setTopic, addMessage, updateLastMessage, finishAgent, setStreaming, setActiveAgent, reset } =
    useDebateStore();
  const activeWorkflow = getWorkflow(workflowId) ?? WORKFLOWS[0];

  useEffect(() => {
    setInput(activeWorkflow.prompt);
  }, [activeWorkflow.id, activeWorkflow.prompt]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    if (attachedFiles.length + incoming.length > 5) {
      alert('최대 5개 파일까지 첨부할 수 있습니다.');
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const results: ProcessedFile[] = [];
      const errors: string[] = [];
      for (const file of incoming) {
        try {
          results.push(await processFile(file));
        } catch (err) {
          errors.push(err instanceof Error ? `${file.name}: ${err.message}` : `${file.name}: 처리 실패`);
        }
      }
      if (results.length > 0) setAttachedFiles((prev) => [...prev, ...results]);
      if (errors.length > 0) alert(errors.join('\n'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && attachedFiles.length === 0) || isStreaming) return;

    reset();

    const textFiles = attachedFiles.filter((f): f is ProcessedFile & { type: "text" } => f.type === "text");
    const imageFiles = attachedFiles.filter((f): f is ProcessedFile & { type: "image" } => f.type === "image");

    let fullTopic = trimmed;
    if (textFiles.length > 0) {
      const fileSections = textFiles.map((f) => `\n\n---\n[첨부파일: ${f.name}]\n${f.text}`).join('');
      fullTopic = trimmed ? trimmed + fileSections : `첨부파일 분석 요청${fileSections}`;
    }
    if (!trimmed && textFiles.length === 0 && imageFiles.length > 0) {
      fullTopic = `첨부 이미지(${imageFiles.map(f => f.name).join(', ')})를 분석하고 점검해주세요.`;
    }

    setTopic(trimmed || attachedFiles[0]?.name || "첨부파일 점검");
    setStreaming(true);

    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: fullTopic,
          ...(imageFiles.length > 0 ? { images: imageFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType })) } : {}),
        }),
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
      setAttachedFiles([]);
    }
  }

  const hasImages = attachedFiles.some(f => f.type === "image");
  const hasTexts = attachedFiles.some(f => f.type === "text");

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
              attachedFiles.length > 0
                ? `${hasImages ? "🖼️" : "📎"} ${attachedFiles.length}개 파일 첨부됨 — 어떤 점을 검토할지 한 줄로 적어주세요`
                : activeWorkflow.prompt
            }
            disabled={isStreaming}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-3.5 pr-12 text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none transition-all focus:border-omega focus:ring-1 focus:ring-omega/50 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isStreaming || uploading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-omega transition-colors disabled:opacity-30"
            title="파일/이미지 첨부"
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
            multiple
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
        <button
          type="submit"
          disabled={isStreaming || (!input.trim() && attachedFiles.length === 0)}
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
      {attachedFiles.length > 0 && !isStreaming && (
        <div className="mt-2 space-y-1">
          <div className="text-xs text-[var(--text-secondary)]">
            {hasImages && hasTexts ? "🖼️📎" : hasImages ? "🖼️" : "📎"} {attachedFiles.length}개 파일 첨부됨
          </div>
          {attachedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-3 py-2 text-sm">
              <span>{f.type === "image" ? "🖼️" : "📎"}</span>
              <span className="text-[var(--text-primary)]">{f.name}</span>
              {f.type === "text" && (
                <span className="text-[var(--text-secondary)]">({(f.text.length / 1000).toFixed(1)}K자)</span>
              )}
              {f.type === "image" && (
                <img
                  src={`data:${f.mimeType};base64,${f.base64}`}
                  alt={f.name}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                className="ml-auto text-[var(--text-secondary)] hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {attachedFiles.length === 0 && (
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          지원: 모든 이미지(HEIC, PNG, JPG 등) · 문서(PDF, DOCX, PPTX, TXT, MD, CSV)
        </p>
      )}
    </form>
  );
}
