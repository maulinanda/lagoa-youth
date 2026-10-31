
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: number;
  name: string;
  icon: string | null;
};

type Activity = {
  id: number;
  title: string;
  description: string | null;
  category_id: number;
  start_at: string;
  end_at: string;
  location: string;
  capacity: number;
  organizer_id: string;
};

const supabase = createClient();

// Mengubah timestamp menjadi format tanggal lokal: YYYY-MM-DD
function formatDateLocal(dateString: string) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Mengubah timestamp menjadi format jam lokal: HH:mm
function formatTimeLocal(dateString: string) {
  const date = new Date(dateString);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export default function EditActivityPage() {
  const router = useRouter();
  const params = useParams();

  const activityId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");

  // Tanggal dan jam dipisahkan
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  const [loading, setLoading] = useState(true);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      // Periksa user yang sedang login
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setError("Sesi login tidak ditemukan. Silakan login kembali.");
        setLoading(false);
        return;
      }

      // Ambil kategori
      const { data: categoryData, error: categoryError } =
        await supabase
          .from("categories")
          .select("id, name, icon")
          .order("id");

      if (cancelled) return;

      if (categoryError) {
        console.error(categoryError);
        setError("Gagal memuat kategori.");
        setLoading(false);
        return;
      }

      setCategories(categoryData ?? []);

      // Ambil aktivitas
      const { data: activityData, error: activityError } =
        await supabase
          .from("activities")
          .select(
            "id, title, description, category_id, start_at, end_at, location, capacity, organizer_id",
          )
          .eq("id", activityId)
          .single();

      if (cancelled) return;

      if (activityError || !activityData) {
        console.error(activityError);
        setError("Aktivitas tidak ditemukan.");
        setLoading(false);
        return;
      }

      // Hanya pembuat aktivitas yang boleh mengedit
      if (activityData.organizer_id !== user.id) {
        setError("Anda tidak memiliki akses untuk mengedit aktivitas ini.");
        setLoading(false);
        return;
      }

      const activity = activityData as Activity;

      setTitle(activity.title);
      setCategoryId(String(activity.category_id));
      setDescription(activity.description ?? "");

      // Pisahkan tanggal dan jam dari data yang tersimpan
      setStartDate(formatDateLocal(activity.start_at));
      setStartTime(formatTimeLocal(activity.start_at));
      setEndDate(formatDateLocal(activity.end_at));
      setEndTime(formatTimeLocal(activity.end_at));

      setLocation(activity.location);
      setCapacity(String(activity.capacity));

      setActivityLoaded(true);
      setLoading(false);
    }

    if (activityId) {
      loadData();
    }

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  async function handleUpdateActivity(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    // Validasi field wajib
    if (
      !title.trim() ||
      !categoryId ||
      !startDate ||
      !startTime ||
      !endDate ||
      !endTime ||
      !location.trim() ||
      !capacity
    ) {
      setError("Mohon lengkapi semua field yang wajib diisi.");
      return;
    }

    // Gabungkan tanggal dan jam menjadi waktu lokal
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

    // Validasi kapasitas
    const capacityNumber = Number(capacity);

    if (!Number.isInteger(capacityNumber) || capacityNumber < 1) {
      setError("Kapasitas peserta minimal 1 orang dan harus berupa bilangan bulat.");
      return;
    }

    setSaving(true);

    try {
      // Pastikan user masih login
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Sesi login tidak ditemukan. Silakan login kembali.");
        return;
      }

      // Simpan perubahan hanya jika user adalah organizer
      const { data: updatedActivity, error: updateError } =
        await supabase
          .from("activities")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            category_id: Number(categoryId),
            start_at: startDateTime.toISOString(),
            end_at: endDateTime.toISOString(),
            location: location.trim(),
            capacity: capacityNumber,
          })
          .eq("id", Number(activityId))
          .eq("organizer_id", user.id)
          .select("id")
          .maybeSingle();

      if (updateError) {
        console.error(updateError);
        setError(`Gagal memperbarui aktivitas: ${updateError.message}`);
        return;
      }

      if (!updatedActivity) {
        setError(
          "Perubahan tidak tersimpan. Pastikan Anda adalah pembuat aktivitas dan memiliki izin untuk mengeditnya.",
        );
        return;
      }

      router.push(`/activity/${activityId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-gray-600">Memuat aktivitas...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.push(`/activity/${activityId}`)}
          className="mb-5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          ← Kembali ke Aktivitas
        </button>

        <h1 className="text-3xl font-bold text-gray-900">
          Edit Aktivitas
        </h1>

        <p className="mt-2 text-gray-600">
          Perbarui informasi aktivitas yang kamu buat.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {activityLoaded && (
          <form
            onSubmit={handleUpdateActivity}
            className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm"
          >
            {/* Nama aktivitas */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Nama aktivitas
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Contoh: Futsal Minggu Pagi"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Kategori
              </label>
              <select
                required
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
              >
                <option value="" disabled>
                  Pilih kategori
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon ? `${category.icon} ` : ""}
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Deskripsi */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Deskripsi
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Ceritakan aktivitas ini..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Tanggal dan jam mulai */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Mulai
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-1 block text-xs text-gray-500"
                  >
                    Tanggal
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="startTime"
                    className="mb-1 block text-xs text-gray-500"
                  >
                    Jam
                  </label>
                  <input
                    id="startTime"
                    type="time"
                    required
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            </div>

            {/* Tanggal dan jam selesai */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Selesai
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-1 block text-xs text-gray-500"
                  >
                    Tanggal
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    required
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endTime"
                    className="mb-1 block text-xs text-gray-500"
                  >
                    Jam
                  </label>
                  <input
                    id="endTime"
                    type="time"
                    required
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            </div>

            {/* Lokasi */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Lokasi
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Contoh: Lapangan Lagoa"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Kapasitas */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Kapasitas peserta
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                placeholder="Contoh: 20"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Tombol simpan */}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
