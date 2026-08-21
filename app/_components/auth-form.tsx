"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function AuthForm({
  isConfigured,
  nextPath,
  initialError,
}: {
  isConfigured: boolean;
  nextPath: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isConfigured) {
      setError("Supabase 환경변수를 먼저 설정해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError("이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }

      const safeNextPath = nextPath.startsWith("/") ? nextPath : "/admin";
      router.replace(safeNextPath);
      router.refresh();
    } catch {
      setError("로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="text-xs font-bold text-slate-600" htmlFor="email">
          관리자 이메일
        </label>
        <input
          autoComplete="email"
          className="mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8eaff4] focus:ring-4 focus:ring-[#edf3ff]"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@example.com"
          required
          type="email"
          value={email}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600" htmlFor="password">
          비밀번호
        </label>
        <input
          autoComplete="current-password"
          className="mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8eaff4] focus:ring-4 focus:ring-[#edf3ff]"
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호를 입력하세요"
          required
          type="password"
          value={password}
        />
      </div>

      {error ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="flex h-13 w-full items-center justify-center rounded-2xl bg-[#142033] text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "로그인 중..." : "관리자 로그인"}
      </button>
    </form>
  );
}
