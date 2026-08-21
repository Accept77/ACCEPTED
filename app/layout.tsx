import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "pretendard/dist/web/variable/pretendardvariable.css";

import { SITE_TITLE } from "@/lib/constants";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_TITLE}`,
  },
  description: "다시 가고 싶은 맛집만 모아 공유하는 개인 큐레이션 지도",
  openGraph: {
    title: SITE_TITLE,
    description: "다시 가고 싶은 맛집만 모아 공유하는 개인 큐레이션 지도",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f7f9",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
