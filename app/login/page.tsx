"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }

    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      console.error(loginError);

      setError(
        "Email atau password salah. Silakan periksa kembali.",
      );

      setLoading(false);
      return;
    }

    setSuccess("Login berhasil! Mengarahkan ke Discover...");

    setTimeout(() => {
      router.push("/discover");
    }, 500);
  }

  return (
    <main className="min-h-screen bg-[#F8FAF9] px-6 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">

        <div className="w-full">

          {/* Header */}
          <div className="text-center">
            <Link
              href="/"
              className="text-xl font-bold text-teal-700"
            >
              Lagoa Youth
            </Link>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Selamat datang kembali 👋
            </h1>

            <p className="mt-2 text-gray-600">
              Masuk untuk melanjutkan aktivitasmu di Lagoa Youth.
            </p>
          </div>

          {/* Login Card */}
          <form
            onSubmit={handleLogin}
            className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
          >

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-800"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="nama@email.com"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* Password */}
            <div className="mt-5">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-800"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Masukkan password"
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Masuk..." : "Masuk"}
            </button>

            {/* Register */}
            <div className="mt-6 border-t border-gray-100 pt-6 text-center">
              <p className="text-sm text-gray-500">
                Belum punya akun?
              </p>

              <Link
                href="/register"
                className="mt-2 inline-block font-semibold text-teal-700 hover:text-teal-800"
              >
                Daftar sekarang →
              </Link>
            </div>

          </form>

          {/* Back to Landing */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Kembali ke Lagoa Youth
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}