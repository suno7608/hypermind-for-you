"use client";

import { useDebateStore } from "@/lib/store";
import AgentCard from "./AgentCard";
import { downloadFullDebate } from "@/lib/download";

export default function DebatePanel() {
  const messages = useDebateStore((s) => s.messages);
  const topic = useDebateStore((s) => s.topic);
  const selectedDebate = useDebateStore((s) => s.selectedDebate);

  const displayMessages = selectedDebate
    ? (JSON.parse(selectedDebate.agents_output) as { agent: string; content: string; done: boolean }[])
    : messages;

  const displayTopic = selectedDebate ? selectedDebate.topic : topic;
  const allDone = displayMessages.length > 0 && displayMessages.every((m) => m.done);

  if (displayMessages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-[var(--text-secondary)]">
        <div className="text-6xl opacity-20">&#x1F9E0;</div>
        <div className="space-y-2 text-center">
          <p className="text-lg text-[var(--text-primary)]">비밀번호를 입력하면 4명의 에이전트가 최종 검증을 순차적으로 수행합니다</p>
          <p className="text-sm text-[var(--text-secondary)]">
            이 모드는 비용이 큰 대신 가장 엄격한 품질 검증을 제공하는 Council 전용 플로우입니다.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { icon: "Ω", color: "#6c5ce7", label: "프레임 확장" },
            { icon: "Ψ", color: "#e17055", label: "약점 비평" },
            { icon: "⚖", color: "#0984e3", label: "수정 우선순위" },
            { icon: "Δ", color: "#00b894", label: "제출 가능성 검증" },
          ].map((a) => (
            <span
              key={a.icon}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
                style={{ backgroundColor: a.color }}>{a.icon}</span>
              {a.label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {selectedDebate && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-4 py-2 text-sm">
          <span className="text-[var(--text-secondary)]">기록 보기:</span>
          <span className="font-medium">{selectedDebate.topic}</span>
          <button onClick={() => useDebateStore.getState().setSelectedDebate(null)}
            className="ml-auto text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">닫기</button>
        </div>
      )}

      {displayMessages.some((m) => m.content) && (
        <div className="flex justify-end">
          <button onClick={() => downloadFullDebate(displayTopic, displayMessages.filter((m) => m.content))}
            className="flex items-center gap-2 rounded-xl bg-[#6c5ce7] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#5a4bd6] hover:shadow-lg">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            📄 Council 최종 검증 보고서 전체 다운로드{!allDone ? " (진행 중)" : ""}
          </button>
        </div>
      )}

      {displayMessages.map((msg, i) => (
        <AgentCard key={`${msg.agent}-${i}`} agentId={msg.agent} content={msg.content} done={msg.done} />
      ))}

      {allDone && (
        <div className="flex justify-center pt-4 pb-2">
          <button onClick={() => downloadFullDebate(displayTopic, displayMessages)}
            className="flex items-center gap-2 rounded-xl bg-[#6c5ce7] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#5a4bd6] hover:shadow-lg">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            📄 Council 최종 검증 보고서 전체 다운로드
          </button>
        </div>
      )}
    </div>
  );
}
