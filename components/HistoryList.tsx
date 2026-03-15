"use client";

import { useEffect } from "react";
import { useDebateStore, type DebateHistory } from "@/lib/store";

interface HistoryListProps {
  onSelectDebate?: () => void;
  userPin?: string | null;
  isAdmin?: boolean;
}

export default function HistoryList({ onSelectDebate, userPin, isAdmin }: HistoryListProps) {
  const { history, setHistory, removeFromHistory, setSelectedDebate, isStreaming } = useDebateStore();

  useEffect(() => {
    fetchHistory();
  }, [userPin, isAdmin]);

  async function fetchHistory() {
    try {
      const params = new URLSearchParams();
      if (isAdmin) params.set("admin", "true");
      else if (userPin) params.set("pin", userPin);
      const res = await fetch(`/api/history?${params}`);
      if (res.ok) {
        const data: DebateHistory[] = await res.json();
        setHistory(data);
      }
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) removeFromHistory(id);
    } catch {}
  }

  function handleSelect(debate: DebateHistory) {
    if (isStreaming) return;
    setSelectedDebate(debate);
    onSelectDebate?.();
  }

  if (history.length === 0) {
    return (
      <div className="text-center text-sm text-[var(--text-secondary)]/60 py-8">
        아직 저장된 점검 기록이 없습니다
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {history.map((item) => (
        <div
          key={item.id}
          className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 transition-colors hover:bg-[var(--bg-card)] cursor-pointer"
          onClick={() => handleSelect(item)}
        >
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{item.topic}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {new Date(item.created_at).toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-400 transition-all text-sm px-2"
            title="삭제"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
