"use client";

import ReactMarkdown from "react-markdown";
import { AGENTS } from "@/lib/agents";
import { useDebateStore } from "@/lib/store";
import { downloadSingleAgent } from "@/lib/download";

interface AgentCardProps {
  agentId: string;
  content: string;
  done: boolean;
}

export default function AgentCard({ agentId, content, done }: AgentCardProps) {
  const activeAgent = useDebateStore((s) => s.activeAgent);
  const topic = useDebateStore((s) => s.topic);
  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return null;

  const isActive = activeAgent === agentId && !done;

  return (
    <div className="agent-card animate-fade-in-up" style={{ borderLeftColor: agent.color, borderLeftWidth: 3 }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-white"
            style={{ backgroundColor: agent.color }}>{agent.icon}</span>
          <div>
            <span className="font-semibold text-[var(--text-primary)]">{agent.name}</span>
            <span className="ml-2 text-xs text-[var(--text-secondary)]">{agent.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {done && (
            <button onClick={() => downloadSingleAgent(agentId, content, topic)} title="이 에이전트 결과 다운로드"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
          {isActive && <span className="pulse-dot" style={{ backgroundColor: agent.color }} />}
          {done && (
            <span className="agent-badge text-white"
              style={{ backgroundColor: `${agent.color}33`, color: agent.color }}>점검 완료</span>
          )}
        </div>
      </div>
      <div className={`prose max-w-none ${isActive ? "streaming-cursor" : ""}`}>
        {content ? (
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const isInline = !className;
                return isInline ? (
                  <code className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs" {...props}>{children}</code>
                ) : (
                  <pre className="overflow-x-auto rounded-lg bg-[var(--bg-primary)] p-4">
                    <code className={className} {...props}>{children}</code>
                  </pre>
                );
              },
            }}
          >{content}</ReactMarkdown>
        ) : (
          <span className="text-[var(--text-secondary)]/50">응답 대기 중...</span>
        )}
      </div>
    </div>
  );
}
