"use client";

import { useState, useEffect } from "react";

export default function TutorialModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceTutorial = params.get("tutorial") === "1";
    
    if (forceTutorial) {
      setTimeout(() => setIsOpen(true), 500);
      return;
    }
    
    const hasSeenTutorial = localStorage.getItem("hypermind-tutorial-seen");
    if (!hasSeenTutorial) {
      setTimeout(() => setIsOpen(true), 1500);
    }
  }, []);

  const closeTutorial = () => {
    setIsOpen(false);
    if (dontShowAgain) {
      localStorage.setItem("hypermind-tutorial-seen", "true");
    }
  };

  const steps = [
    {
      badge: "WELCOME",
      title: "Level Up Your Decisions",
      subtitle: "혼자 결정하지 마세요. AI 전문가들과 함께 생각하세요.",
      content: (
        <div className="space-y-5">
          <div className="rounded-[24px] p-6 border border-[var(--border)]" style={{
            background: "linear-gradient(145deg, rgba(149, 84, 31, 0.08) 0%, rgba(149, 84, 31, 0.04) 100%)"
          }}>
            <p className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              당신의 판단력 × AI의 통찰력 = 완전히 다른 결과
            </p>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              중요한 결정 앞에서, 혼자서는 보이지 않던 <strong className="text-[var(--text-primary)]">맹점</strong>과 <strong className="text-[var(--text-primary)]">기회</strong>를 
              4명의 AI 전문가가 찾아냅니다.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="surface-panel p-5">
              <div className="text-2xl mb-2">🎯</div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">더 빠르게</p>
              <p className="text-xs text-[var(--text-secondary)]">1-3분 안에 다각도 분석</p>
            </div>
            <div className="surface-panel p-5">
              <div className="text-2xl mb-2">🔍</div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">더 깊이</p>
              <p className="text-xs text-[var(--text-secondary)]">4가지 관점에서 검증</p>
            </div>
            <div className="surface-panel p-5">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">더 날카롭게</p>
              <p className="text-xs text-[var(--text-secondary)]">약점과 리스크 즉시 발견</p>
            </div>
            <div className="surface-panel p-5">
              <div className="text-2xl mb-2">✨</div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">더 확실하게</p>
              <p className="text-xs text-[var(--text-secondary)]">최종 품질까지 검증 완료</p>
            </div>
          </div>
        </div>
      )
    },
    {
      badge: "YOUR TEAM",
      title: "4명의 AI 전문가가 당신의 참모진입니다",
      subtitle: "각자의 개성과 전문성으로 당신의 생각을 확장합니다",
      content: (
        <div className="space-y-4">
          <div className="rounded-[24px] p-5 text-white shadow-lg" style={{
            background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)"
          }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-bold bg-white/20 rounded-xl w-12 h-12 flex items-center justify-center">Ω</span>
              <div>
                <p className="text-lg font-bold">Omega — 초차원 통찰</p>
                <p className="text-sm opacity-90">전략가 · 기회 발견자</p>
              </div>
            </div>
            <p className="text-base leading-relaxed opacity-95 mb-3">
              "당신이 미처 보지 못한 <strong>새로운 관점</strong>을 제시합니다. 
              익숙한 프레임을 벗어나 <strong>숨은 기회</strong>를 찾아냅니다."
            </p>
            <div className="text-sm bg-white/15 rounded-lg px-3 py-2 inline-block">
              💡 "이 방향도 고려해보는 건 어떨까요?"
            </div>
          </div>

          <div className="rounded-[24px] p-5 text-white shadow-lg" style={{
            background: "linear-gradient(135deg, #e17055 0%, #fab1a0 100%)"
          }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-bold bg-white/20 rounded-xl w-12 h-12 flex items-center justify-center">Ψ</span>
              <div>
                <p className="text-lg font-bold">Psi — 초절정 비평</p>
                <p className="text-sm opacity-90">비평가 · 리스크 헌터</p>
              </div>
            </div>
            <p className="text-base leading-relaxed opacity-95 mb-3">
              "날카롭게 <strong>허점을 찾아냅니다</strong>. 
              당신의 논리가 공격받을 지점, 놓친 변수를 <strong>강하게 지적</strong>합니다."
            </p>
            <div className="text-sm bg-white/15 rounded-lg px-3 py-2 inline-block">
              🔥 "이 부분은 설득력이 부족합니다"
            </div>
          </div>

          <div className="rounded-[24px] p-5 text-white shadow-lg" style={{
            background: "linear-gradient(135deg, #00b894 0%, #55efc4 100%)"
          }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-bold bg-white/20 rounded-xl w-12 h-12 flex items-center justify-center">Δ</span>
              <div>
                <p className="text-lg font-bold">Delta — 9차원 검증관</p>
                <p className="text-sm opacity-90">품질 관리자 · 최종 검수</p>
              </div>
            </div>
            <p className="text-base leading-relaxed opacity-95 mb-3">
              "발표 전 <strong>최종 품질을 점검</strong>합니다. 
              실제로 공유 가능한 수준인지, <strong>빠진 부분은 없는지</strong> 체크합니다."
            </p>
            <div className="text-sm bg-white/15 rounded-lg px-3 py-2 inline-block">
              ✅ "이 3가지만 수정하면 완벽합니다"
            </div>
          </div>
        </div>
      )
    },
    {
      badge: "HOW IT WORKS",
      title: "3단계로 시작하세요",
      subtitle: "복잡하지 않습니다. 생각을 말하면 AI가 함께 고민합니다.",
      content: (
        <div className="space-y-5">
          <div className="relative">
            <div className="absolute left-6 top-12 bottom-12 w-0.5" style={{
              background: "linear-gradient(180deg, var(--accent) 0%, rgba(149, 84, 31, 0.2) 100%)"
            }}></div>
            
            <div className="relative flex gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg z-10" style={{
                background: "linear-gradient(135deg, #95541f 0%, #ca6a1d 100%)"
              }}>
                1
              </div>
              <div className="flex-1 pt-1">
                <p className="text-lg font-bold text-[var(--text-primary)] mb-2">목적을 선택하세요</p>
                <p className="text-base text-[var(--text-secondary)] mb-3 leading-relaxed">
                  "보고서 검토", "전략 검증", "비즈니스 아이디어" 등 <strong className="text-[var(--text-primary)]">원하는 워크플로우</strong>를 클릭하세요.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="studio-chip">📊 보고서</span>
                  <span className="studio-chip">🎯 전략</span>
                  <span className="studio-chip">💡 아이디어</span>
                </div>
              </div>
            </div>

            <div className="relative flex gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg z-10" style={{
                background: "linear-gradient(135deg, #95541f 0%, #ca6a1d 100%)"
              }}>
                2
              </div>
              <div className="flex-1 pt-1">
                <p className="text-lg font-bold text-[var(--text-primary)] mb-2">생각을 입력하세요</p>
                <p className="text-base text-[var(--text-secondary)] mb-3 leading-relaxed">
                  검토받고 싶은 내용을 <strong className="text-[var(--text-primary)]">자유롭게</strong> 적어주세요. 길어도 괜찮습니다!
                </p>
                <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border-2 border-dashed border-[var(--border)]">
                  <p className="text-sm text-[var(--text-secondary)] italic">
                    예: "우리 회사가 유럽 에어컨 시장에 진출하려고 하는데, 어떤 리스크가 있을까요?"
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg z-10" style={{
                background: "linear-gradient(135deg, #95541f 0%, #ca6a1d 100%)"
              }}>
                3
              </div>
              <div className="flex-1 pt-1">
                <p className="text-lg font-bold text-[var(--text-primary)] mb-2">AI가 분석을 시작합니다</p>
                <p className="text-base text-[var(--text-secondary)] mb-3 leading-relaxed">
                  <strong className="text-[var(--text-primary)]">1-3분</strong> 안에 선택한 에이전트가 다각도로 분석한 결과를 받아볼 수 있습니다.
                </p>
                <div className="rounded-[20px] p-4 border border-[var(--border)]" style={{
                  background: "linear-gradient(145deg, rgba(149, 84, 31, 0.06) 0%, rgba(149, 84, 31, 0.02) 100%)"
                }}>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    ⚡ 빠른 피드백 · 🔍 깊은 통찰 · ✨ 실행 가능한 조언
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      badge: "USE CASES",
      title: "이럴 때 사용하세요",
      subtitle: "실제 업무에서 바로 적용할 수 있습니다",
      content: (
        <div className="space-y-4">
          <div className="rounded-[20px] p-5 border-l-4" style={{
            background: "linear-gradient(135deg, rgba(8, 145, 178, 0.08) 0%, rgba(8, 145, 178, 0.02) 100%)",
            borderColor: "#0891b2"
          }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <p className="text-base font-bold text-[var(--text-primary)] mb-2">보고서 제출 전</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  "임원 보고 자료인데 <strong className="text-[var(--text-primary)]">빈틈이 없는지</strong> 확인하고 싶어" 
                  → <strong className="text-[var(--text-primary)]">Psi가 약점을 찾고</strong>, Delta가 최종 점검합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] p-5 border-l-4" style={{
            background: "linear-gradient(135deg, rgba(108, 92, 231, 0.08) 0%, rgba(108, 92, 231, 0.02) 100%)",
            borderColor: "#6c5ce7"
          }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-base font-bold text-[var(--text-primary)] mb-2">전략 수립 시</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  "중국 시장 진출 계획을 세웠는데 <strong className="text-[var(--text-primary)]">리스크는 뭐가 있을까?</strong>" 
                  → <strong className="text-[var(--text-primary)]">Omega가 기회를 찾고</strong>, Psi가 리스크를 경고합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] p-5 border-l-4" style={{
            background: "linear-gradient(135deg, rgba(0, 184, 148, 0.08) 0%, rgba(0, 184, 148, 0.02) 100%)",
            borderColor: "#00b894"
          }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-base font-bold text-[var(--text-primary)] mb-2">아이디어 검증</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  "새로운 사업 아이디어가 있는데 <strong className="text-[var(--text-primary)]">실현 가능성은 어떨까?</strong>" 
                  → <strong className="text-[var(--text-primary)]">Omega가 관점을 확장</strong>하고, Delta가 실행 가능성을 검증합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[20px] p-5 border-l-4" style={{
            background: "linear-gradient(135deg, rgba(225, 112, 85, 0.08) 0%, rgba(225, 112, 85, 0.02) 100%)",
            borderColor: "#e17055"
          }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="text-base font-bold text-[var(--text-primary)] mb-2">의사결정 전</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  "A안과 B안 중 뭐가 나을지 <strong className="text-[var(--text-primary)]">객관적인 의견이 필요해</strong>" 
                  → <strong className="text-[var(--text-primary)]">4명의 전문가가 각 안을 분석</strong>하고 비교해드립니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] p-6 text-white text-center shadow-xl" style={{
            background: "linear-gradient(135deg, #8f4d18 0%, #ca6a1d 100%)"
          }}>
            <p className="text-xl font-bold mb-2">✨ 혼자 고민하지 마세요</p>
            <p className="text-base opacity-90">
              AI 전문가들과 함께 생각하면, <strong>의사결정의 질이 완전히 달라집니다</strong>
            </p>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{
      background: "rgba(32, 25, 18, 0.85)",
      backdropFilter: "blur(12px)"
    }}>
      <div className="relative w-full max-w-3xl my-8">
        <div className="hero-panel overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 relative" style={{
            background: "linear-gradient(135deg, #95541f 0%, #ca6a1d 100%)"
          }}>
            <button
              onClick={closeTutorial}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="닫기"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <p className="eyebrow text-white/80 mb-2">{currentStep.badge}</p>
            <h2 className="text-3xl font-extrabold text-white mb-2 leading-tight">
              {currentStep.title}
            </h2>
            <p className="text-base text-white/90">
              {currentStep.subtitle}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {currentStep.content}
          </div>

          {/* Footer */}
          <div className="px-8 pb-8">
            {/* Checkbox */}
            <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
              <input
                type="checkbox"
                id="dont-show-again"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-5 h-5 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
              />
              <label htmlFor="dont-show-again" className="text-sm font-medium text-[var(--text-secondary)] cursor-pointer select-none">
                앞으로 다시 보지 않기 (동일 PIN 사용자)
              </label>
            </div>

            {/* Progress */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === step
                      ? "w-16"
                      : idx < step
                      ? "w-2"
                      : "w-2"
                  }`}
                  style={{
                    background: idx === step 
                      ? "linear-gradient(90deg, #95541f 0%, #ca6a1d 100%)"
                      : idx < step
                      ? "rgba(149, 84, 31, 0.4)"
                      : "rgba(149, 84, 31, 0.15)"
                  }}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="soft-button flex-1 justify-center text-base"
                >
                  ← 이전
                </button>
              )}
              <button
                onClick={() => {
                  if (step < steps.length - 1) {
                    setStep(step + 1);
                  } else {
                    closeTutorial();
                  }
                }}
                className="brand-button flex-1 justify-center text-base"
              >
                {step < steps.length - 1 ? "다음 →" : "시작하기 🚀"}
              </button>
            </div>

            {/* Skip */}
            {step < steps.length - 1 && (
              <button
                onClick={closeTutorial}
                className="w-full mt-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium"
              >
                건너뛰기
              </button>
            )}

            {/* Counter */}
            <div className="text-center mt-4 text-sm font-semibold text-[var(--text-secondary)]">
              {step + 1} / {steps.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
