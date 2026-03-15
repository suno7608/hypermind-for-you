import type { Metadata } from "next";
import "./globals.css";
import PinGate from "@/components/PinGate";

export const metadata: Metadata = {
  title: "Hypermind for You",
  description: "업무별 또는 에이전트별로 시작하는 AI 멀티 에이전트 리뷰 스튜디오",
  manifest: "/manifest.json",
  themeColor: "#0a0a0a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hypermind",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-B190PN69T0" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-B190PN69T0');` }} />
      </head>
      <body className="min-h-screen">
        <PinGate>{children}</PinGate>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});`,
          }}
        />
      </body>
    </html>
  );
}
