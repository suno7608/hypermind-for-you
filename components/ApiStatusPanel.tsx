"use client";

import { useEffect, useState } from "react";

type ApiStatus = {
  provider: string;
  modelName: string;
  storageProvider: string;
  storageConfigured: boolean;
  hasAnthropicApiKey: boolean;
  hasCouncilPassword: boolean;
  isStudioReady: boolean;
  isCouncilReady: boolean;
};

export default function ApiStatusPanel() {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        if (!response.ok) throw new Error("status request failed");
        const data = (await response.json()) as ApiStatus;
        if (mounted) setStatus(data);
      } catch {
        if (mounted) setFailed(true);
      }
    }

    loadStatus();
    return () => {
      mounted = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="rounded-[24px] border border-[#f59e0b]/30 bg-[#fff7ed] px-5 py-4 text-sm text-[#9a3412]">
        API 상태를 불러오지 못했습니다. `/api/status` 응답을 확인하세요.
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 text-sm text-[var(--text-secondary)]">
        API 상태를 확인하는 중입니다.
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)] px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">API status</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">운영 준비 상태</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status.isStudioReady ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fee2e2] text-[#991b1b]"
          }`}
        >
          {status.isStudioReady ? "Studio Ready" : "Setup Required"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <StatusItem label="LLM Provider" value={status.provider} ok={true} />
        <StatusItem label="Model" value={status.modelName} ok={status.isStudioReady} />
        <StatusItem label="Storage" value={status.storageProvider} ok={status.storageConfigured} />
        <StatusItem label="Anthropic API Key" value={status.hasAnthropicApiKey ? "Configured" : "Missing"} ok={status.hasAnthropicApiKey} />
        <StatusItem label="Council Password" value={status.hasCouncilPassword ? "Configured" : "Missing"} ok={status.hasCouncilPassword} />
        <StatusItem label="1:1 Studio" value={status.isStudioReady ? "Available" : "Blocked"} ok={status.isStudioReady} />
        <StatusItem label="Council Review" value={status.isCouncilReady ? "Available" : "Blocked"} ok={status.isCouncilReady} />
      </div>
      {status.storageProvider === "memory" && (
        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          현재 배포 환경에서는 메모리 저장소를 사용합니다. 세션/이력 영속화가 필요하면 다음 단계에서 외부 DB로 교체해야 합니다.
        </p>
      )}
      {status.storageProvider === "postgres" && !status.storageConfigured && (
        <p className="mt-4 text-sm leading-6 text-[#b91c1c]">
          `APP_STORAGE=postgres`로 설정되어 있지만 `DATABASE_URL` 또는 `POSTGRES_URL`이 없습니다.
        </p>
      )}
    </div>
  );
}

function StatusItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-white/70 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{value}</p>
      <p className={`mt-2 text-xs font-medium ${ok ? "text-[#166534]" : "text-[#b91c1c]"}`}>{ok ? "OK" : "Action needed"}</p>
    </div>
  );
}
