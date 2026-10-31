
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess(false);

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    setLoading(false);

    if (updateError) {
      console.error(updateError);
      setError(
        "Password belum berhasil diperbarui. Tautan mungkin sudah kedaluwarsa atau tidak valid.",
      );
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      router.push("/login");
    }, 1500);
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
              Buat Password Baru
            </h1>

            <p className="mt-2 text-gray-600">
              Masukkan password baru untuk akun Lagoa Youth kamu.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
          >
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-800"
              >
                Password Baru
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-gray-800"
              >
                Konfirmasi Password Baru
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                minLength={8}
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
                Password berhasil diperbarui. Mengarahkan ke Login...
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="mt-6 w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Menyimpan..."
                : "Simpan Password Baru"}
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
