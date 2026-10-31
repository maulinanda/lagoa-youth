
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: number;
  name: string;
  icon: string | null;
};

const supabase = createClient();

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CreateActivityPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("20");

  const [startDate, setStartDate] = useState(getTodayDate());
  const [startTime, setStartTime] = useState("16:00");
  const [endDate, setEndDate] = useState(getTodayDate());
  const [endTime, setEndTime] = useState("18:00");

  useEffect(() => {
    async function loadCategories() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: categoryError } = await supabase
        .from("categories")
        .select("id, name, icon")
        .order("id");

      if (categoryError) {
        console.error(categoryError);
        setError("Gagal memuat kategori aktivitas.");
      } else {
        setCategories((data ?? []) as Category[]);
      }

      setLoadingCategories(false);
    }

    loadCategories();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!startDate || !startTime || !endDate || !endTime) {
      setError("Tanggal dan jam mulai serta selesai wajib diisi.");
      return;
    }

    // Gabungkan tanggal dan jam untuk validasi serta penyimpanan.
    // Nilai input dianggap sebagai waktu lokal perangkat pengguna.
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      setError("Tanggal atau jam tidak valid.");
      return;
    }

    if (endDateTime <= startDateTime) {
      setError("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    const parsedCapacity = Number(capacity);

    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setError("Kapasitas peserta minimal 1 orang.");
      return;
    }

    if (!categoryId) {
      setError("Silakan pilih kategori aktivitas.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Sesi login tidak ditemukan. Silakan login kembali.");
        return;
      }

      const { error: insertError } = await supabase
        .from("activities")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category_id: Number(categoryId),
          organizer_id: user.id,
          start_at: startDateTime.toISOString(),
          end_at: endDateTime.toISOString(),
          location: location.trim(),
          capacity: parsedCapacity,
          status: "published",
        });

      if (insertError) {
        console.error(insertError);
        setError(`Gagal membuat aktivitas: ${insertError.message}`);
        return;
      }

      router.push("/my-activities");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat membuat aktivitas.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          ← Kembali
        </button>

        <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Buat Aktivitas
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Ajak warga Lagoa untuk berkegiatan bersama.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="title" className={labelClass}>
                Nama aktivitas *
              </label>
              <input
                id="title"
                type="text"
                required
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Futsal Lagoa"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="category" className={labelClass}>
                Kategori *
              </label>
              <select
                id="category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories
                    ? "Memuat kategori..."
                    : "Pilih kategori"}
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ""}
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Deskripsi
              </label>
              <textarea
                id="description"
                rows={4}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kegiatan yang akan dilakukan..."
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="location" className={labelClass}>
                Lokasi *
              </label>
              <input
                id="location"
                type="text"
                required
                maxLength={300}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Lapangan Lagoa"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="capacity" className={labelClass}>
                Kapasitas peserta *
              </label>
              <input
                id="capacity"
                type="number"
                required
                min={1}
                step={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={inputClass}
              />
            </div>

            <section className="rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">
                Waktu mulai
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="startDate" className={labelClass}>
                    Tanggal mulai *
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="startTime" className={labelClass}>
                    Jam mulai *
                  </label>
                  <input
                    id="startTime"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900">
                Waktu selesai
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="endDate" className={labelClass}>
                    Tanggal selesai *
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="endTime" className={labelClass}>
                    Jam selesai *
                  </label>
                  <input
                    id="endTime"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Aktivitas boleh selesai pada hari yang berbeda.
                Pastikan waktu selesai setelah waktu mulai.
              </p>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving || loadingCategories}
                className="w-full rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Buat Aktivitas"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
