import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import { WORKFLOWS } from "@/lib/review-options";

export default function StartHub() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="surface-panel flex flex-col gap-6 px-8 py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Start hub</p>
            <h1 className="mt-3 font-serif text-4xl text-[var(--text-primary)] md:text-5xl">
              어떤 방식으로 리뷰를 시작할지 먼저 고르세요.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              업무 목적에 맞는 단일 에이전트를 먼저 배정하고, 정말 필요한 경우에만 Council 최종 검증으로 넘어갑니다.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="soft-button">
              서비스 소개
            </Link>
            <Link href="/studio?workflow=pitch" className="brand-button">
              기본 플로우로 시작
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="surface-panel px-7 py-7">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">By work</p>
                <h2 className="mt-2 font-serif text-3xl text-[var(--text-primary)]">업무별로 시작</h2>
              </div>
              <p className="max-w-sm text-sm leading-7 text-[var(--text-secondary)]">
                자료의 목적이 명확할 때 가장 빠른 진입 방식입니다.
              </p>
            </div>
            <div className="grid gap-4">
              {WORKFLOWS.map((workflow) => (
                <Link
                  key={workflow.id}
                  href={`/studio?workflow=${workflow.id}`}
                  className="selection-card group block rounded-[28px] px-6 py-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: workflow.accent }}>
                        {workflow.badge}
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{workflow.title}</h3>
                    </div>
                    <span className="text-sm text-[var(--text-secondary)] transition-transform group-hover:translate-x-1">
                      시작하기
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{workflow.summary}</p>
                  <div className="mt-5 rounded-2xl bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)]">
                    배정 에이전트: {AGENTS.find((agent) => agent.id === workflow.agentId)?.name} / {workflow.deliverable}
                  </div>
                </Link>
              ))}
              <Link
                href="/studio?mode=council"
                className="selection-card group block rounded-[28px] px-6 py-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">Protected Council</p>
                    <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">4인 순차 최종 검증</h3>
                  </div>
                  <span className="text-sm text-[var(--text-secondary)] transition-transform group-hover:translate-x-1">
                    비밀번호 입력
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                  토큰 비용이 큰 최종 검증 플로우입니다. 승인된 사용자만 비밀번호를 입력하고 실행할 수 있습니다.
                </p>
              </Link>
            </div>
          </section>

          <section className="surface-panel px-7 py-7">
            <div className="mb-6">
              <p className="eyebrow">By agent</p>
              <h2 className="mt-2 font-serif text-3xl text-[var(--text-primary)]">에이전트별로 시작</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                특정 관점만 빠르게 받고 싶을 때는 바로 해당 에이전트와 1:1 리뷰를 시작하세요.
              </p>
            </div>
            <div className="grid gap-4">
              {AGENTS.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/studio?agent=${agent.id}`}
                  className="selection-card group flex items-start gap-4 rounded-[26px] px-5 py-5"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-semibold text-white"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{agent.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{agent.role}</p>
                      </div>
                      <span className="text-sm text-[var(--text-secondary)] transition-transform group-hover:translate-x-1">
                        직접 점검
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                      {agent.id === "omega" && "관점을 넓히고 메시지를 다시 설계해야 할 때 적합합니다."}
                      {agent.id === "psi" && "허점과 리스크를 빠르게 들춰내야 할 때 적합합니다."}
                      {agent.id === "arbiter" && "실행 우선순위와 최종 판단 정리가 필요할 때 적합합니다."}
                      {agent.id === "delta" && "제출 직전 품질 검증과 최종 체크가 필요할 때 적합합니다."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
