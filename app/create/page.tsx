"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: number;
  name: string;
  icon: string | null;
};

const supabase = createClient();

export default function CreateActivityPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  const [loadingCategories, setLoadingCategories] =
    useState(true);
  const [loading, setLoading] = useState(false);

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // MINIMUM DATETIME
  // Digunakan untuk mencegah user memilih waktu yang sudah
  // lewat pada input datetime-local.
  // =========================================================

  const nowForInput = new Date();

  nowForInput.setMinutes(
    nowForInput.getMinutes() -
      nowForInput.getTimezoneOffset(),
  );

  const minDateTime = nowForInput
    .toISOString()
    .slice(0, 16);

  // =========================================================
  // INITIALIZE PAGE
  // =========================================================

  useEffect(() => {
    async function initializePage() {
      setCheckingAuth(true);

      // 1. Cek apakah user sudah login
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // 2. Kalau belum login, arahkan ke Login
      if (userError || !user) {
        router.replace("/login");
        return;
      }

      // 3. Kalau sudah login, ambil kategori
      const { data, error: categoryError } =
        await supabase
          .from("categories")
          .select("id, name, icon")
          .order("id");

      if (categoryError) {
        console.error(categoryError);
        setError("Gagal memuat kategori.");
      } else {
        setCategories(data ?? []);
      }

      setLoadingCategories(false);
      setCheckingAuth(false);
    }

    initializePage();
  }, [router]);

  // =========================================================
  // CREATE ACTIVITY
  // =========================================================

  async function handleCreateActivity(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // =======================================================
    // VALIDASI FIELD WAJIB
    // =======================================================

    if (
      !title ||
      !categoryId ||
      !startAt ||
      !endAt ||
      !location ||
      !capacity
    ) {
      setError(
        "Mohon lengkapi semua field yang wajib diisi.",
      );
      return;
    }

    // =======================================================
    // KONVERSI WAKTU
    // =======================================================

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    const now = new Date();

    // =======================================================
    // VALIDASI WAKTU MULAI
    // =======================================================

    if (startDate < now) {
      setError(
        "Waktu mulai tidak boleh berada di masa lalu.",
      );
      return;
    }

    // =======================================================
    // VALIDASI WAKTU SELESAI
    // =======================================================

    if (endDate < now) {
      setError(
        "Waktu selesai tidak boleh berada di masa lalu.",
      );
      return;
    }

    // =======================================================
    // VALIDASI URUTAN WAKTU
    // =======================================================

    if (endDate <= startDate) {
      setError(
        "Waktu selesai harus setelah waktu mulai.",
      );
      return;
    }

    // =======================================================
    // VALIDASI KAPASITAS
    // =======================================================

    const capacityNumber = Number(capacity);

    if (capacityNumber < 1) {
      setError(
        "Kapasitas peserta minimal 1 orang.",
      );
      return;
    }

    setLoading(true);

    // =======================================================
    // CEK ULANG USER SEBELUM MENYIMPAN
    // =======================================================

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Sesi login tidak ditemukan. Silakan login kembali.",
      );
      setLoading(false);
      router.replace("/login");
      return;
    }

    // =======================================================
    // SIMPAN AKTIVITAS
    // =======================================================

    const { error: insertError } =
      await supabase
        .from("activities")
        .insert({
          title: title.trim(),
          description:
            description.trim() || null,
          category_id: Number(categoryId),
          organizer_id: user.id,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          location: location.trim(),
          capacity: capacityNumber,
          status: "published",
        });

    // =======================================================
    // CEK ERROR INSERT
    // =======================================================

    if (insertError) {
      console.error(insertError);

      setError(
        `Gagal membuat aktivitas: ${insertError.message}`,
      );

      setLoading(false);
      return;
    }

    // =======================================================
    // BERHASIL
    // =======================================================

    setSuccess(
      "Aktivitas berhasil dibuat! 🎉",
    );

    setLoading(false);

    setTimeout(() => {
      router.push("/discover");
    }, 1000);
  }

  // =========================================================
  // LOADING AUTH
  // =========================================================

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#F8FAF9] px-6 py-16">
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
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-[#F8FAF9] px-6 py-10 pb-28 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            Lagoa Youth
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Buat Aktivitas
          </h1>

          <p className="mt-2 text-gray-600">
            Buat aktivitas dan ajak orang lain untuk bergabung.
          </p>
        </div>

        {/* ================================================= */}
        {/* FORM */}
        {/* ================================================= */}

        <form
          onSubmit={handleCreateActivity}
          className="space-y-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
        >

          {/* ================================================= */}
          {/* JUDUL */}
          {/* ================================================= */}

          <div>
            <label className="block text-sm font-semibold text-gray-800">
              Nama Aktivitas
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Contoh: Futsal Lagoa"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* ================================================= */}
          {/* KATEGORI */}
          {/* ================================================= */}

          <div>
            <label className="block text-sm font-semibold text-gray-800">
              Kategori
            </label>

            <select
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              disabled={loadingCategories}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">
                {loadingCategories
                  ? "Memuat kategori..."
                  : "Pilih kategori"}
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.icon
                    ? `${category.icon} `
                    : ""}
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* ================================================= */}
          {/* DESKRIPSI */}
          {/* ================================================= */}

          <div>
            <label className="block text-sm font-semibold text-gray-800">
              Deskripsi
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="Ceritakan sedikit tentang aktivitas ini..."
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* ================================================= */}
          {/* WAKTU */}
          {/* ================================================= */}

          <div className="grid gap-5 sm:grid-cols-2">

            {/* Mulai */}
            <div>
              <label className="block text-sm font-semibold text-gray-800">
                Mulai
              </label>

              <input
                type="datetime-local"
                value={startAt}
                min={minDateTime}
                onChange={(event) =>
                  setStartAt(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* Selesai */}
            <div>
              <label className="block text-sm font-semibold text-gray-800">
                Selesai
              </label>

              <input
                type="datetime-local"
                value={endAt}
                min={
                  startAt || minDateTime
                }
                onChange={(event) =>
                  setEndAt(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>

          </div>

          {/* ================================================= */}
          {/* LOKASI */}
          {/* ================================================= */}

          <div>
            <label className="block text-sm font-semibold text-gray-800">
              Lokasi
            </label>

            <input
              type="text"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value,
                )
              }
              placeholder="Contoh: Lapangan Muncang"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* ================================================= */}
          {/* KAPASITAS */}
          {/* ================================================= */}

          <div>
            <label className="block text-sm font-semibold text-gray-800">
              Kapasitas Peserta
            </label>

            <input
              type="number"
              min="1"
              value={capacity}
              onChange={(event) =>
                setCapacity(
                  event.target.value,
                )
              }
              placeholder="Contoh: 20"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* ================================================= */}
          {/* ERROR */}
          {/* ================================================= */}

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ================================================= */}
          {/* SUCCESS */}
          {/* ================================================= */}

          {success && (
            <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* ================================================= */}
          {/* SUBMIT */}
          {/* ================================================= */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Membuat Aktivitas..."
              : "Buat Aktivitas"}
          </button>

        </form>
      </div>
    </main>
  );
}