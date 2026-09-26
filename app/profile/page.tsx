"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  area: string | null;
  bio: string | null;
};

const supabase = createClient();

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);

  const [fullName, setFullName] = useState("");
  const [area, setArea] = useState("");
  const [bio, setBio] = useState("");

  const [editing, setEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setError("");
      setCheckingAuth(true);

      // =====================================================
      // CEK LOGIN
      // =====================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // Kalau belum login → langsung ke Login
      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);

      // =====================================================
      // LOAD PROFILE
      // =====================================================

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, area, bio")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error(profileError);
        setError("Gagal memuat profile.");
        setLoading(false);
        return;
      }

      setProfile(data);

      setFullName(data.full_name);
      setArea(data.area ?? "");
      setBio(data.bio ?? "");

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  function handleStartEdit() {
    if (!profile) return;

    setError("");
    setSuccess("");

    setFullName(profile.full_name);
    setArea(profile.area ?? "");
    setBio(profile.bio ?? "");

    setEditing(true);
  }

  function handleCancelEdit() {
    if (!profile) return;

    setError("");
    setSuccess("");

    setFullName(profile.full_name);
    setArea(profile.area ?? "");
    setBio(profile.bio ?? "");

    setEditing(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Sesi login tidak ditemukan.");
      setSaving(false);
      router.replace("/login");
      return;
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        area: area.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id, full_name, avatar_url, area, bio")
      .single();

    if (updateError) {
      console.error(updateError);
      setError("Gagal menyimpan perubahan.");
      setSaving(false);
      return;
    }

    setProfile(data);

    setFullName(data.full_name);
    setArea(data.area ?? "");
    setBio(data.bio ?? "");

    setSuccess("Profile berhasil diperbarui! 🎉");
    setEditing(false);
    setSaving(false);
  }

  async function handleLogout() {
    const confirmed = window.confirm(
      "Yakin ingin keluar dari akun?",
    );

    if (!confirmed) return;

    setError("");
    setLoggingOut(true);

    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      console.error(logoutError);
      setError("Gagal keluar dari akun.");
      setLoggingOut(false);
      return;
    }

    router.push("/login");
  }

  // =========================================================
  // MEMERIKSA LOGIN
  // =========================================================

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              Memeriksa sesi login...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // LOADING PROFILE
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-gray-500">
            Memuat profile...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error && !profile) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-600">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Profile
          </h1>

          <p className="mt-2 text-gray-600">
            Kenali dirimu di komunitas Lagoa Youth.
          </p>
        </div>

        {/* ================================================= */}
        {/* MODE LIHAT PROFILE */}
        {/* ================================================= */}

        {!editing ? (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-2xl font-bold text-teal-700">
                {profile.full_name
                  .charAt(0)
                  .toUpperCase() || "?"}
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900">
                  {profile.full_name}
                </h2>

                {profile.area ? (
                  <p className="mt-1 text-sm text-gray-500">
                    📍 {profile.area}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-400">
                    Area belum diisi
                  </p>
                )}
              </div>
            </div>

            {/* Profile Information */}
            <div className="mt-8 space-y-6 border-t border-gray-100 pt-6">

              {/* Nama */}
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Nama lengkap
                </p>

                <p className="mt-1 text-base text-gray-900">
                  {profile.full_name}
                </p>
              </div>

              {/* Area */}
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Area
                </p>

                <p className="mt-1 text-base text-gray-900">
                  {profile.area || "Belum diisi"}
                </p>
              </div>

              {/* Bio */}
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Bio
                </p>

                <p className="mt-1 whitespace-pre-line text-base leading-7 text-gray-900">
                  {profile.bio || "Belum diisi"}
                </p>
              </div>

            </div>

            {/* Success */}
            {success && (
              <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                {success}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 space-y-3 border-t border-gray-100 pt-6">

              <button
                type="button"
                onClick={handleStartEdit}
                className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800"
              >
                ✏️ Edit Profile
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut
                  ? "Keluar..."
                  : "Logout"}
              </button>

            </div>
          </div>
        ) : (

          /* ================================================= */
          /* MODE EDIT PROFILE */
          /* ================================================= */

          <form
            onSubmit={handleSave}
            className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
          >

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-2xl font-bold text-teal-700">
                {fullName
                  .charAt(0)
                  .toUpperCase() || "?"}
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Profile
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Ubah informasi profile kamu.
                </p>
              </div>
            </div>

            {/* Nama */}
            <div className="mt-8">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nama lengkap
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                placeholder="Nama kamu"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Area */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Area
              </label>

              <input
                type="text"
                value={area}
                onChange={(event) =>
                  setArea(event.target.value)
                }
                placeholder="Contoh: Lagoa"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Bio */}
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Bio
              </label>

              <textarea
                value={bio}
                onChange={(event) =>
                  setBio(event.target.value)
                }
                rows={4}
                placeholder="Ceritakan sedikit tentang dirimu..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Menyimpan..."
                  : "Simpan"}
              </button>

            </div>
          </form>
        )}

      </div>
    </main>
  );
}