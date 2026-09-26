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

function formatDateTimeLocal(dateString: string) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditActivityPage() {
  const router = useRouter();
  const params = useParams();

  const activityId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setError("");

      // Ambil user yang sedang login
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

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

      if (activityError || !activityData) {
        console.error(activityError);
        setError("Aktivitas tidak ditemukan.");
        setLoading(false);
        return;
      }

      // Pastikan hanya organizer yang boleh mengedit
      if (activityData.organizer_id !== user.id) {
        setError("Anda tidak memiliki akses untuk mengedit aktivitas ini.");
        setLoading(false);
        return;
      }

      const activity = activityData as Activity;

      setTitle(activity.title);
      setCategoryId(String(activity.category_id));
      setDescription(activity.description ?? "");
      setStartAt(formatDateTimeLocal(activity.start_at));
      setEndAt(formatDateTimeLocal(activity.end_at));
      setLocation(activity.location);
      setCapacity(String(activity.capacity));

      setLoading(false);
    }

    if (activityId) {
      loadData();
    }
  }, [activityId]);

  async function handleUpdateActivity(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    // Validasi dasar
    if (
      !title ||
      !categoryId ||
      !startAt ||
      !endAt ||
      !location ||
      !capacity
    ) {
      setError("Mohon lengkapi semua field yang wajib diisi.");
      return;
    }

    // Validasi waktu
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate <= startDate) {
      setError("Waktu selesai harus setelah waktu mulai.");
      return;
    }

    // Validasi kapasitas
    const capacityNumber = Number(capacity);

    if (capacityNumber < 1) {
      setError("Kapasitas peserta minimal 1 orang.");
      return;
    }

    setSaving(true);

    // Pastikan user masih login
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      setSaving(false);
      return;
    }

    // Update aktivitas
    const { error: updateError } = await supabase
      .from("activities")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        category_id: Number(categoryId),
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        location: location.trim(),
        capacity: capacityNumber,
      })
      .eq("id", Number(activityId))
      .eq("organizer_id", user.id);

    if (updateError) {
      console.error(updateError);

      setError(
        `Gagal memperbarui aktivitas: ${updateError.message}`,
      );

      setSaving(false);
      return;
    }

    // Kembali ke halaman detail
    router.push(`/activity/${activityId}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-gray-600">
              Memuat aktivitas...
            </p>
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
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!error && (
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
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
              >
                <option value="" disabled>
                  Pilih kategori
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
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
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
                placeholder="Ceritakan aktivitas ini..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Waktu */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Mulai
                </label>

                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) =>
                    setStartAt(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Selesai
                </label>

                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) =>
                    setEndAt(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
                />
              </div>
            </div>

            {/* Lokasi */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Lokasi
              </label>

              <input
                type="text"
                value={location}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
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
                value={capacity}
                onChange={(event) =>
                  setCapacity(event.target.value)
                }
                min="1"
                placeholder="Contoh: 20"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-teal-600"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
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