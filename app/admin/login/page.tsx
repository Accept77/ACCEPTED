import type { Metadata } from "next";
import Link from "next/link";
import { MapPinned } from "lucide-react";
import { redirect } from "next/navigation";

import { AuthForm } from "@/app/_components/auth-form";
import { isSupabaseConfigured } from "@/lib/config";
import { SITE_TITLE } from "@/lib/constants";
import { getAdminStatus } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;
  const { isAdmin } = await getAdminStatus();

  if (isAdmin) redirect(next?.startsWith("/") ? next : "/admin");

  const initialError = error === "not-admin" ? "이 계정은 관리자 권한이 없습니다." : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-5 py-10">
      <div className="w-full max-w-md">
        <Link className="mx-auto flex w-fit items-center gap-3" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#142033] text-white">
            <MapPinned aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="text-sm font-bold text-slate-900">{SITE_TITLE}</span>
        </Link>

        <section className="mt-10 rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_-35px_rgba(20,32,51,0.45)] sm:p-8">
          <p className="text-xs font-black tracking-[0.22em] text-[#2f6fed]">PRIVATE ADMIN AREA</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.07em] text-slate-900">관리자 로그인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">등록한 맛집을 관리하려면 관리자 계정으로 로그인해 주세요.</p>

          {!isSupabaseConfigured() ? (
            <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
              현재는 Supabase 환경변수가 없어 로그인 기능이 비활성화되어 있습니다. `.env.local`을 설정한 뒤 다시 시작해 주세요.
            </p>
          ) : null}

          <AuthForm
            initialError={initialError}
            isConfigured={isSupabaseConfigured()}
            nextPath={next ?? "/admin"}
          />
        </section>

        <Link className="mx-auto mt-6 block w-fit text-xs font-semibold text-slate-400 transition hover:text-slate-700" href="/">
          ← 공개 페이지로 돌아가기
        </Link>
      </div>
    </main>
  );
}
