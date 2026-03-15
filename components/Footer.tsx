export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center gap-4 text-center text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Hypermind" className="h-6 w-6 rounded-md" />
            <span className="font-semibold text-[var(--text-primary)]">Hypermind for You</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 opacity-60">
            <span>© {year} Hypermind for You</span>
            <span>·</span>
            <span>All rights reserved</span>
            <span>·</span>
            <span>Powered by SoonHo Chung</span>
          </div>
          <p className="opacity-40 text-[10px]">
            본 서비스의 AI 리뷰 결과는 참고 용도이며, 최종 의사결정의 책임은 사용자에게 있습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
