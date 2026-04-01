"use client";

import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import { WORKFLOWS } from "@/lib/review-options";
import Footer from "./Footer";
import { usePinContext } from "./PinGate";
import TutorialModal from "./TutorialModal";

const DIRECT_REVIEW_AGENTS = AGENTS.filter((agent) => agent.id !== "arbiter");

const valueCards = [
  {
    title: "당신의 판단력에 AI의 관점을 더하세요",
    description: "혼자서는 보이지 않던 맹점, 놓친 기회, 숨은 리스크를 에이전트가 찾아냅니다.",
    icon: "🔍",
  },
  {
    title: "같은 시간, 다른 결과 — AI와 먼저 생각하세요",
    description: "당신이 미처 고려하지 못한 반론·기회·리스크까지, 의사결정의 밀도가 달라집니다.",
    icon: "⚡",
  },
  {
    title: "중요한 결정 앞에서, 가장 날카로운 참모를 만나세요",
    description: "4명의 AI 전문가가 당신의 생각을 확장하고, 판단의 빈틈을 채워드립니다.",
    icon: "🧠",
  },
];

export default function HypermindLanding() {
  const { isAdmin } = usePinContext();
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <TutorialModal />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <nav className="surface-panel flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Hypermind" className="h-11 w-11 rounded-2xl" />
            <div>
              <p className="eyebrow">Team review workspace</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                Hypermind for You
                {isAdmin && <span className="ml-2 inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white align-middle">ADMIN</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/studio" className="brand-button">
              시작하기
            </Link>
          </div>
        </nav>

        <section className="hero-panel overflow-hidden px-8 py-10 md:px-10 md:py-14">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left — Title & CTA */}
            <div className="relative">
              <div className="hero-glow hero-glow-left" />
              <div className="hero-glow hero-glow-right" />
              <p className="eyebrow relative">AI-powered decision support</p>
              <h1 className="relative mt-4 max-w-4xl text-[3.4rem] font-extrabold leading-[1.05] tracking-[-0.06em] text-[var(--text-primary)] md:text-[5.4rem]" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif" }}>
                Level Up
                <br />
                <span className="text-[var(--accent)]">Your Decisions</span>
              </h1>
              <p className="relative mt-2 text-lg font-medium text-[var(--text-primary)] opacity-70 md:text-xl">
                의사결정의 차원이 달라집니다
              </p>
              <p className="relative mt-6 max-w-xl text-[15px] leading-8 text-[var(--text-secondary)]">
                Hypermind for You는 업무 목적에 맞는 AI 에이전트들이 당신의 업무를 빠르고, 밀도 높게 도와주는 서비스입니다.
                당신의 생각과 초안을 검토받고, 날카롭게 비평받고, 필요할 때는 최종 Council 검증까지 확장할 수 있습니다.
              </p>
              <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/studio" className="brand-button justify-center text-base px-8 py-3.5">
                  시작하기 →
                </Link>
              </div>
            </div>

            {/* Right — 3 Value Cards */}
            <div className="grid gap-4">
              {valueCards.map((card) => (
                <article key={card.title} className="selection-card rounded-[24px] px-6 py-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-primary)] text-xl">
                      {card.icon}
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold leading-snug text-[var(--text-primary)]">{card.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">{card.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="entry-options" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] scroll-mt-24">
          <div className="surface-panel px-7 py-7">
            <p className="eyebrow">Workflow first</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">업무 목적에 맞춰 에이전트를 바로 배정합니다</h2>
            <div className="mt-6 grid gap-4">
              {WORKFLOWS.map((workflow) => (
                <Link
                  key={workflow.id}
                  href={`/studio?workflow=${workflow.id}`}
                  className="selection-card rounded-[26px] px-5 py-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: workflow.accent }}>
                    {workflow.badge}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{workflow.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{workflow.summary}</p>
                  {(() => {
                    const agent = AGENTS.find((a) => a.id === workflow.agentId);
                    return agent ? (
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.icon}
                        </span>
                        <span className="text-sm text-[var(--text-primary)]">배정 에이전트: {agent.name}</span>
                      </div>
                    ) : null;
                  })()}
                </Link>
              ))}
              <Link href="/studio?mode=council" className="selection-card rounded-[26px] px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Protected Council</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">4인 순차 최종 검증</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  비용이 큰 최종 검증 플로우는 비밀번호가 있는 사용자만 실행할 수 있게 따로 분리했습니다.
                </p>
              </Link>
            </div>
          </div>

          <div className="surface-panel px-7 py-7">
            <p className="eyebrow">Agent first</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">에이전트를 먼저 고르는 시작 흐름</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {DIRECT_REVIEW_AGENTS.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/studio?agent=${agent.id}`}
                  className="selection-card rounded-[26px] px-5 py-5"
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-semibold text-white"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.icon}
                  </span>
                  <h3 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{agent.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{agent.role}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    {agent.id === "omega" && "발표 메시지와 관점을 넓히고 싶을 때 적합합니다."}
                    {agent.id === "psi" && "허점과 리스크를 빠르게 찾아내고 싶을 때 적합합니다."}
                    {agent.id === "delta" && "제출 직전 품질 검증과 최종 체크가 필요할 때 적합합니다."}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
