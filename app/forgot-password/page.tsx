
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }

    setLoading(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

    setLoading(false);

    if (resetError) {
      console.error(resetError);
      setError(
        "Email pemulihan belum dapat dikirim. Silakan coba lagi.",
      );
      return;
    }

    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-[#F8FAF9] px-6 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="text-center">
            <Link
              href="/"
              className="text-xl font-bold text-teal-700"
            >
              Lagoa Youth
            </Link>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Lupa Password?
            </h1>

            <p className="mt-2 text-gray-600">
              Masukkan email akunmu. Kami akan mengirimkan
              tautan untuk membuat password baru.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
          >
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

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700"
              >
                Jika email tersebut terdaftar, tautan pemulihan
                akan dikirim. Silakan periksa inbox dan folder spam.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Mengirim..." : "Kirim Tautan Pemulihan"}
            </button>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm font-semibold text-teal-700 hover:text-teal-800"
              >
                ← Kembali ke Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
