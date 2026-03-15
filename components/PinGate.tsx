"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PinContextType {
  userPin: string | null;
  isAdmin: boolean;
  logout: () => void;
}

const PinContext = createContext<PinContextType>({ userPin: null, isAdmin: false, logout: () => {} });

export function usePinContext() {
  return useContext(PinContext);
}

export default function PinGate({ children }: { children: ReactNode }) {
  const [userPin, setUserPin] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedPin = sessionStorage.getItem("hypermind_pin");
    const savedAdmin = sessionStorage.getItem("hypermind_admin") === "true";
    if (savedPin) {
      setUserPin(savedPin);
      setIsAdmin(savedAdmin);
      setReady(true);
    }
    setChecking(false);
  }, []);

  function logout() {
    sessionStorage.removeItem("hypermind_pin");
    sessionStorage.removeItem("hypermind_admin");
    setUserPin(null);
    setIsAdmin(false);
    setReady(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pinInput.length < 4) {
      setPinError("PIN은 4자리 이상이어야 합니다.");
      return;
    }
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserPin(pinInput);
        setIsAdmin(data.admin || false);
        sessionStorage.setItem("hypermind_pin", pinInput);
        sessionStorage.setItem("hypermind_admin", data.admin ? "true" : "false");
        setReady(true);
        setPinError("");
      } else {
        setPinError(data.error || "PIN 검증 실패");
      }
    } catch {
      setPinError("서버 연결 실패");
    }
  }

  if (checking) return null;

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6">
        <div className="w-full max-w-sm">
          <div className="surface-panel px-8 py-10 text-center">
            <img src="/favicon.svg" alt="Hypermind" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Hypermind for You</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              개인 PIN을 입력하세요. 기록이 PIN별로 안전하게 분리됩니다.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN (4자리 이상)"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-center text-lg tracking-widest text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                autoFocus
              />
              {pinError && <p className="text-sm text-red-500">{pinError}</p>}
              <button type="submit" className="brand-button w-full justify-center">
                시작하기
              </button>
            </form>
            <p className="mt-4 text-[10px] text-[var(--text-secondary)] opacity-60">
              ⚠️ PIN을 분실하면 기존 기록을 복구할 수 없습니다. 안전하게 보관하세요.
            </p>

          </div>
        </div>
      </div>
    );
  }

  return (
    <PinContext.Provider value={{ userPin, isAdmin, logout }}>
      {children}
    </PinContext.Provider>
  );
}
