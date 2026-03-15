"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import DebatePanel from "@/components/DebatePanel";
import HistoryList from "@/components/HistoryList";
import AgentChat from "@/components/AgentChat";
import CouncilReviewInput from "@/components/CouncilReviewInput";
import { useDebateStore, type AgentChatHistory } from "@/lib/store";
import Footer from "./Footer";
import { usePinContext } from "./PinGate";
import { AGENTS } from "@/lib/agents";
import { WORKFLOWS, getWorkflow, type WorkflowId } from "@/lib/review-options";

type StudioMode = "workflow" | "agent" | "council";
const DIRECT_REVIEW_AGENTS = AGENTS.filter((agent) => agent.id !== "arbiter");
type StudioSearchParams = Record<string, string | string[] | undefined>;

function groupByDate<T extends { updated_at?: string; created_at: string }>(items: T[]): { label: string; items: T[] }[] {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const groups: { label: string; items: T[] }[] = [
    { label: "오늘", items: [] },
    { label: "이번 주", items: [] },
    { label: "이전", items: [] },
  ];

  for (const item of items) {
    const dateStr = (item.updated_at || item.created_at).slice(0, 10);
    const date = new Date(item.updated_at || item.created_at);
    if (dateStr === todayStr) groups[0].items.push(item);
    else if (date >= weekAgo) groups[1].items.push(item);
    else groups[2].items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}

function CollapseSection({
  title,
  defaultOpen = true,
  count,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  count?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="mb-3 flex w-full items-center justify-between text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <span className="flex items-center gap-2">
          <span className={`text-[11px] transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
          {title}
          {count !== undefined && <span className="text-[10px] font-normal opacity-60">({count})</span>}
        </span>
      </button>
      {open && children}
    </div>
  );
}

function normalizeAgent(agentId: string | null) {
  return AGENTS.find((agent) => agent.id === agentId)?.id ?? null;
}

function withAlpha(color: string, alpha: number) {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildStudioUrl({
  workflowId,
  agentId,
  council,
}: {
  workflowId?: WorkflowId;
  agentId?: string;
  council?: boolean;
}) {
  if (council) return "/studio?mode=council";
  if (agentId) return `/studio?agent=${agentId}`;
  return `/studio?workflow=${workflowId ?? WORKFLOWS[0].id}`;
}

export default function ReviewStudio({ searchParams }: { searchParams?: StudioSearchParams }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { topic, isStreaming, messages, agentChatHistory, setAgentChatHistory, removeAgentChat, reset } =
    useDebateStore();

  const resolvedModeParam = typeof searchParams?.mode === "string" ? searchParams.mode : undefined;
  const resolvedAgentParam = typeof searchParams?.agent === "string" ? searchParams.agent : undefined;
  const resolvedWorkflowParam = typeof searchParams?.workflow === "string" ? searchParams.workflow : undefined;
  const councilMode = resolvedModeParam === "council";
  const directAgentId = normalizeAgent(resolvedAgentParam ?? null);
  const workflow = getWorkflow(resolvedWorkflowParam) ?? (councilMode || directAgentId ? null : WORKFLOWS[0]);
  const mode: StudioMode = councilMode ? "council" : workflow ? "workflow" : "agent";
  const resolvedAgentId = directAgentId ?? workflow?.agentId ?? AGENTS[0].id;
  const currentAgent = AGENTS.find((agent) => agent.id === resolvedAgentId) ?? AGENTS[0];
  const activeAccent = mode === "council" ? "#95541f" : workflow?.accent ?? currentAgent.color;
  const activeSurfaceStyle = {
    borderColor: withAlpha(activeAccent, 0.24),
    background: `linear-gradient(145deg, ${withAlpha(activeAccent, 0.14)} 0%, rgba(255, 253, 248, 0.92) 42%, rgba(255, 255, 255, 0.98) 100%)`,
    boxShadow: `0 26px 56px ${withAlpha(activeAccent, 0.12)}`,
  };

  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showAllChats, setShowAllChats] = useState(false);
  const { userPin, isAdmin } = usePinContext();

  const fetchAgentChats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (isAdmin) params.set("admin", "true");
      else if (userPin) params.set("pin", userPin);
      const res = await fetch(`/api/agent-chats?${params}`);
      if (res.ok) setAgentChatHistory(await res.json());
    } catch {}
  }, [setAgentChatHistory, userPin, isAdmin]);

  useEffect(() => {
    fetchAgentChats();
  }, [fetchAgentChats]);

  function navigateToWorkflow(workflowId: WorkflowId) {
    reset();
    setChatSessionId(null);
    setMobileMenu(false);
    startTransition(() => {
      router.replace(buildStudioUrl({ workflowId }));
    });
  }

  function navigateToAgent(agentId: string) {
    reset();
    setChatSessionId(null);
    setMobileMenu(false);
    startTransition(() => {
      router.replace(buildStudioUrl({ agentId }));
    });
  }

  function navigateToCouncil() {
    reset();
    setChatSessionId(null);
    setMobileMenu(false);
    startTransition(() => {
      router.replace(buildStudioUrl({ council: true }));
    });
  }

  function openCouncilHistory() {
    setChatSessionId(null);
    setMobileMenu(false);
    startTransition(() => {
      router.replace(buildStudioUrl({ council: true }));
    });
  }

  function handleAgentChatSelect(chat: AgentChatHistory) {
    setChatSessionId(chat.id);
    setMobileMenu(false);
    startTransition(() => {
      router.replace(buildStudioUrl({ agentId: chat.agent_id }));
    });
  }

  async function handleDeleteAgentChat(id: string) {
    await fetch("/api/agent-chats", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    removeAgentChat(id);
  }

  const filteredChats = searchQuery.trim()
    ? agentChatHistory.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : agentChatHistory;

  const chatGroups = groupByDate(filteredChats);
  const visibleChats = showAllChats ? filteredChats : filteredChats.slice(0, 15);
  const hasMore = filteredChats.length > 15 && !showAllChats;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {mobileMenu && (
        <div className="fixed inset-0 z-40 bg-[var(--overlay)] lg:hidden" onClick={() => setMobileMenu(false)} />
      )}

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[340px] overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-5 transition-transform lg:relative lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="surface-panel mb-5 px-5 py-5">
            <p className="eyebrow">Hypermind for You</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Review Studio
              {isAdmin && <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white align-middle">ADMIN</span>}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              업무 목적에 따라 단일 에이전트를 배정하고, 정말 필요한 경우에만 Council 최종 검증을 실행합니다.
            </p>
            <div className="mt-5 flex gap-2">
              <Link href="/" className="soft-button text-sm">
                메인으로
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <CollapseSection title="업무별 시작" defaultOpen={true}>
              <div className="grid gap-3">
                {WORKFLOWS.map((item) => {
                  const active = mode === "workflow" && workflow?.id === item.id;
                  const matchedAgent = AGENTS.find((agent) => agent.id === item.agentId);
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateToWorkflow(item.id)}
                      className={`selection-card rounded-[24px] px-4 py-4 text-left transition-all ${
                        active ? "ring-2" : ""
                      }`}
                      style={
                        active
                          ? {
                              borderColor: withAlpha(item.accent, 0.4),
                              background: `linear-gradient(145deg, ${withAlpha(item.accent, 0.14)} 0%, rgba(255, 255, 255, 0.96) 100%)`,
                              boxShadow: `0 22px 44px ${withAlpha(item.accent, 0.12)}`,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: item.accent }}>
                            {item.badge}
                          </p>
                          <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{item.title}</p>
                        </div>
                        {matchedAgent && (
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-semibold text-white"
                            style={{ backgroundColor: matchedAgent.color }}
                          >
                            {matchedAgent.icon}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">{item.summary}</p>
                      <p className="mt-3 text-[11px] leading-5 text-[var(--text-secondary)]">배정 에이전트: {matchedAgent?.name}</p>
                    </button>
                  );
                })}
              </div>
            </CollapseSection>

            <CollapseSection title="Council 최종 검증" defaultOpen={true}>
              <button
                onClick={navigateToCouncil}
                className={`selection-card w-full rounded-[24px] px-4 py-4 text-left transition-all ${
                  mode === "council" ? "ring-2 ring-[var(--accent)]" : ""
                }`}
                style={
                  mode === "council"
                    ? {
                        borderColor: withAlpha("#95541f", 0.35),
                        background: `linear-gradient(145deg, ${withAlpha("#95541f", 0.12)} 0%, rgba(255, 255, 255, 0.97) 100%)`,
                        boxShadow: `0 22px 44px ${withAlpha("#95541f", 0.12)}`,
                      }
                    : undefined
                }
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Protected mode</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">4인 순차 최종 검증</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
                  비용이 큰 최종 검증 플로우입니다. 비밀번호를 입력한 사용자만 실행할 수 있습니다.
                </p>
              </button>
            </CollapseSection>

            <CollapseSection title="에이전트별 직접 리뷰" defaultOpen={true}>
              <div className="grid gap-3">
                {DIRECT_REVIEW_AGENTS.map((agent) => {
                  const active = mode === "agent" && currentAgent.id === agent.id && !chatSessionId;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => navigateToAgent(agent.id)}
                      className={`selection-card rounded-[22px] px-4 py-4 text-left transition-all ${
                        active ? "ring-2" : ""
                      }`}
                      style={
                        active
                          ? {
                              borderColor: withAlpha(agent.color, 0.38),
                              background: `linear-gradient(145deg, ${withAlpha(agent.color, 0.14)} 0%, rgba(255, 255, 255, 0.98) 100%)`,
                              boxShadow: `0 22px 44px ${withAlpha(agent.color, 0.12)}`,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.icon}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{agent.name}</p>
                          <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">{agent.role}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CollapseSection>

            <CollapseSection title="저장된 Council 검증" defaultOpen={true}>
              <HistoryList onSelectDebate={openCouncilHistory} userPin={userPin} isAdmin={isAdmin} />
            </CollapseSection>

            <CollapseSection title="저장된 1:1 세션" defaultOpen={true} count={agentChatHistory.length}>
              <div className="mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setShowAllChats(false);
                  }}
                  placeholder="세션 검색..."
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
                />
              </div>

              {filteredChats.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
                  {searchQuery ? "검색 결과가 없습니다" : "아직 저장된 세션이 없습니다"}
                </p>
              ) : searchQuery ? (
                <div className="flex flex-col gap-2">
                  {visibleChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      selected={mode !== "council" && chatSessionId === chat.id}
                      onSelect={handleAgentChatSelect}
                      onDelete={handleDeleteAgentChat}
                    />
                  ))}
                  {hasMore && (
                    <button onClick={() => setShowAllChats(true)} className="soft-button w-full text-sm">
                      더 보기
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {chatGroups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        {group.label}
                      </p>
                      <div className="space-y-2">
                        {(showAllChats ? group.items : group.items.slice(0, 8)).map((chat) => (
                          <ChatItem
                            key={chat.id}
                            chat={chat}
                            selected={mode !== "council" && chatSessionId === chat.id}
                            onSelect={handleAgentChatSelect}
                            onDelete={handleDeleteAgentChat}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapseSection>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[color:rgba(247,239,227,0.92)] px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenu(!mobileMenu)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] lg:hidden"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <img src="/favicon.svg" alt="Hypermind" className="h-11 w-11 rounded-2xl" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
                    {mode === "workflow" && "Workflow matched review"}
                    {mode === "agent" && "Agent direct review"}
                    {mode === "council" && "Protected council review"}
                    {isAdmin && <span className="ml-2 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white tracking-normal normal-case">ADMIN</span>}
                  </p>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {mode === "workflow" && workflow?.title}
                    {mode === "agent" && `${currentAgent.name} 직접 리뷰`}
                    {mode === "council" && "Council 최종 검증"}
                  </h2>
                  <p className="mt-1 text-xs font-medium" style={{ color: activeAccent }}>
                    현재 선택된 리뷰 모드가 오른쪽 작업 화면에 반영되어 있습니다.
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-3 md:flex">
                {isPending && <span className="text-sm text-[var(--text-secondary)]">선택 변경 중...</span>}
                {mode === "council" && isStreaming && (
                  <div className="flex items-center gap-2 text-sm text-[var(--accent)]">
                    <span className="pulse-dot bg-[var(--accent)]" />
                    4인 검증 진행 중
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 px-5 py-5">
            <div className="mb-5 rounded-[34px] border px-7 py-7" style={activeSurfaceStyle}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="eyebrow">
                    {mode === "workflow" && workflow?.badge}
                    {mode === "agent" && currentAgent.role}
                    {mode === "council" && "Final quality gate"}
                  </p>
                  <h3 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
                    {mode === "workflow" && `${currentAgent.name}에게 맡기는 ${workflow?.title}`}
                    {mode === "agent" && `${currentAgent.name} Direct Review`}
                    {mode === "council" && "4명의 에이전트로 하는 최종 검증"}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                    {mode === "workflow" && workflow?.summary}
                    {mode === "agent" &&
                      "특정 관점만 빠르게 받고 싶다면 바로 에이전트와 대화를 시작하세요. 초안 문장, 슬라이드 문구, 사업 판단 모두 넣을 수 있습니다."}
                    {mode === "council" &&
                      "토큰 비용이 큰 대신 가장 엄격한 리뷰입니다. 준비된 자료에 한해 비밀번호를 입력하고 실행하세요."}
                  </p>
                  {mode === "workflow" && workflow && (
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">배정 이유: {workflow.agentReason}</p>
                  )}
                </div>
                <div className="flex max-w-xl flex-wrap gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: activeAccent }}
                  >
                    현재 선택
                  </span>
                  {(mode === "workflow"
                    ? [
                        `${currentAgent.name} 배정`,
                        workflow?.deliverable ?? "",
                        "단일 에이전트 비용 최적화",
                      ]
                    : mode === "agent"
                      ? [`${currentAgent.name} 관점`, "파일 첨부 가능", "즉시 수정 제안"]
                      : ["비밀번호 필요", "4인 순차 점검", "최종 검증 전용"]).map((item) => (
                    <span key={item} className="studio-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {mode === "council" ? (
              <div className="space-y-5">
                <div className="surface-panel px-6 py-6">
                  <CouncilReviewInput userPin={userPin} />
                  {topic && messages.length > 0 && (
                    <p className="mt-4 text-sm text-[var(--text-secondary)]">
                      현재 최종 검증 안건: <span className="font-medium text-[var(--text-primary)]">{topic}</span>
                    </p>
                  )}
                </div>
                <div className="surface-panel min-h-[400px] px-6 py-6">
                  <DebatePanel />
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[34px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
                <AgentChat
                  agentId={resolvedAgentId}
                  sessionId={chatSessionId}
                  onClose={() => router.push("/")}
                  onNewSession={(id) => setChatSessionId(id)}
                  onSaved={fetchAgentChats}
                  initialPrompt={workflow?.prompt}
                  emptyStateText={
                    mode === "workflow"
                      ? `${currentAgent.name}가 ${workflow?.title} 기준으로 바로 검토를 시작합니다. 프롬프트를 수정하거나 파일을 붙여 넣어도 됩니다.`
                      : `${currentAgent.name}에게 직접 질문하며 필요한 관점만 빠르게 점검받을 수 있습니다.`
                  }
                  inputPlaceholder={
                    mode === "workflow" ? workflow?.prompt : `${currentAgent.name}에게 어떤 점을 검토받을지 적어주세요`
                  }
                  closeLabel="← 메인으로"
                  userPin={userPin}
                />
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

function ChatItem({
  chat,
  selected,
  onSelect,
  onDelete,
}: {
  chat: AgentChatHistory;
  selected: boolean;
  onSelect: (chat: AgentChatHistory) => void;
  onDelete: (id: string) => void;
}) {
  const agent = AGENTS.find((item) => item.id === chat.agent_id);

  return (
    <div
      onClick={() => onSelect(chat)}
      className={`selection-card group flex cursor-pointer items-center gap-3 rounded-[22px] px-4 py-3 ${
        selected ? "ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <span
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-semibold text-white"
        style={{ backgroundColor: agent?.color ?? "#666" }}
      >
        {agent?.icon ?? "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{chat.title}</p>
        <p className="text-[11px] text-[var(--text-secondary)]">
          {new Date(chat.updated_at).toLocaleDateString("ko-KR", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDelete(chat.id);
        }}
        className="px-1 text-xs text-[var(--text-secondary)] opacity-0 transition-all group-hover:opacity-100 hover:text-red-500"
      >
        &times;
      </button>
    </div>
  );
}
