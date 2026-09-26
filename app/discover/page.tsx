"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: number;
  name: string;
  icon: string | null;
};

type ParticipantCount = {
  activity_id: number;
  participant_count: number;
};

type Activity = {
  id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string;
  capacity: number;
  category_id: number;
  categories: {
    name: string;
    icon: string | null;
  }[] | null;
  participant_count: number;
  is_joined: boolean;
};

type QuickFilter =
  | "all"
  | "today"
  | "upcoming"
  | "available"
  | "full"
  | "joined";

const supabase = createClient();

export default function DiscoverPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<number | null>(null);

  const [quickFilter, setQuickFilter] =
    useState<QuickFilter>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setError("");
      setLoading(true);

      // =====================================================
      // CEK USER
      // =====================================================

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // =====================================================
      // LOAD CATEGORIES + ACTIVITIES
      // =====================================================

      const [categoriesResult, activitiesResult] =
        await Promise.all([
          supabase
            .from("categories")
            .select("id, name, icon")
            .order("id"),

          supabase
            .from("activities")
            .select(`
              id,
              title,
              description,
              start_at,
              end_at,
              location,
              capacity,
              category_id,
              categories (
                name,
                icon
              )
            `)
            .eq("status", "published")
            .order("start_at", { ascending: true }),
        ]);

      // =====================================================
      // CEK ERROR KATEGORI
      // =====================================================

      if (categoriesResult.error) {
        console.error(categoriesResult.error);
        setError("Gagal memuat kategori.");
      }

      // =====================================================
      // CEK ERROR AKTIVITAS
      // =====================================================

      if (activitiesResult.error) {
        console.error(activitiesResult.error);
        setError("Gagal memuat aktivitas.");
        setLoading(false);
        return;
      }

      const activityData = activitiesResult.data ?? [];

      // =====================================================
      // TIDAK ADA AKTIVITAS
      // =====================================================

      if (activityData.length === 0) {
        setCategories(categoriesResult.data ?? []);
        setActivities([]);
        setLoading(false);
        return;
      }

      // =====================================================
      // AMBIL ID SEMUA AKTIVITAS
      // =====================================================

      const activityIds = activityData.map(
        (activity) => activity.id,
      );

      // =====================================================
      // AMBIL JUMLAH PESERTA MELALUI RPC
      // =====================================================

      const {
        data: countData,
        error: countError,
      } = await supabase.rpc(
        "get_activity_participant_counts",
        {
          p_activity_ids: activityIds,
        },
      );

      if (countError) {
        console.error(countError);
        setError("Gagal memuat jumlah peserta.");
        setLoading(false);
        return;
      }

      // =====================================================
      // BUAT MAP JUMLAH PESERTA
      //
      // activity_id → participant_count
      // =====================================================

      const participantCountMap = new Map<
        number,
        number
      >();

      (
        (countData ?? []) as ParticipantCount[]
      ).forEach((item) => {
        participantCountMap.set(
          Number(item.activity_id),
          Number(item.participant_count),
        );
      });

      // =====================================================
      // CEK AKTIVITAS YANG SUDAH DIJOIN USER
      // =====================================================

      const joinedActivityIds = new Set<number>();

      if (user) {
        const {
          data: participationData,
          error: participationError,
        } = await supabase
          .from("activity_participants")
          .select("activity_id, status")
          .eq("user_id", user.id)
          .in("status", ["joined", "attended"]);

        if (participationError) {
          console.error(participationError);
        } else {
          (
            participationData ?? []
          ).forEach((item) => {
            joinedActivityIds.add(
              Number(item.activity_id),
            );
          });
        }
      }

      // =====================================================
      // GABUNGKAN DATA AKTIVITAS
      // =====================================================

      const activitiesWithCount: Activity[] =
        activityData.map((activity) => ({
          ...activity,

          participant_count:
            participantCountMap.get(activity.id) ?? 0,

          is_joined: joinedActivityIds.has(activity.id),
        }));

      // =====================================================
      // SIMPAN KE STATE
      // =====================================================

      setCategories(categoriesResult.data ?? []);
      setActivities(activitiesWithCount);

      setLoading(false);
    }

    loadData();
  }, []);

  // =========================================================
  // FORMAT TANGGAL
  // =========================================================

  function formatDate(dateString: string) {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  }

  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const filteredActivities = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const now = new Date();

    // Awal hari ini berdasarkan waktu lokal perangkat user
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Awal besok
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(
      startOfTomorrow.getDate() + 1,
    );

    return activities.filter((activity) => {
      const startAt = new Date(activity.start_at);
      const endAt = new Date(activity.end_at);

      // =====================================================
      // AKTIVITAS YANG SUDAH SELESAI TIDAK MUNCUL
      // =====================================================

      if (endAt <= now) {
        return false;
      }

      // =====================================================
      // SEARCH
      // =====================================================

      const matchesSearch =
        keyword === "" ||
        activity.title
          .toLowerCase()
          .includes(keyword) ||
        activity.description
          ?.toLowerCase()
          .includes(keyword) ||
        activity.location
          .toLowerCase()
          .includes(keyword);

      // =====================================================
      // CATEGORY
      // =====================================================

      const matchesCategory =
        selectedCategory === null ||
        activity.category_id === selectedCategory;

      // =====================================================
      // QUICK FILTER
      // =====================================================

      let matchesQuickFilter = true;

      switch (quickFilter) {
        case "today":
          matchesQuickFilter =
            startAt < startOfTomorrow &&
            endAt > startOfToday;
          break;

        case "upcoming":
          matchesQuickFilter = startAt > now;
          break;

        case "available":
          matchesQuickFilter =
            activity.participant_count <
            activity.capacity;
          break;

        case "full":
          matchesQuickFilter =
            activity.participant_count >=
            activity.capacity;
          break;

        case "joined":
          matchesQuickFilter = activity.is_joined;
          break;

        case "all":
        default:
          matchesQuickFilter = true;
          break;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesQuickFilter
      );
    });
  }, [
    activities,
    search,
    selectedCategory,
    quickFilter,
  ]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Discover
          </h1>

          <p className="mt-2 text-gray-600">
            Temukan aktivitas dan komunitas di Lagoa.
          </p>
        </div>

        {/* ================================================= */}
        {/* SEARCH */}
        {/* ================================================= */}

        <section className="mt-8">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Cari aktivitas
          </label>

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Contoh: futsal, musik, Lagoa..."
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-teal-600"
          />
        </section>

        {/* ================================================= */}
        {/* QUICK FILTER */}
        {/* ================================================= */}

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">
            Jelajahi berdasarkan
          </h2>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">

            {/* Semua */}
            <button
              type="button"
              onClick={() =>
                setQuickFilter("all")
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                quickFilter === "all"
                  ? "bg-teal-700 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Semua
            </button>

            {/* Hari ini */}
            <button
              type="button"
              onClick={() =>
                setQuickFilter("today")
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                quickFilter === "today"
                  ? "bg-teal-700 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Hari ini
            </button>

            {/* Mendatang */}
            <button
              type="button"
              onClick={() =>
                setQuickFilter("upcoming")
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                quickFilter === "upcoming"
                  ? "bg-teal-700 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Mendatang
            </button>

            {/* Masih tersedia */}
            <button
              type="button"
              onClick={() =>
                setQuickFilter("available")
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                quickFilter === "available"
                  ? "bg-teal-700 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Masih tersedia
            </button>

            {/* Penuh */}
            <button
              type="button"
              onClick={() =>
                setQuickFilter("full")
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                quickFilter === "full"
                  ? "bg-teal-700 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Penuh
            </button>

            {/* Sudah diikuti */}
            <button
              type="button"
              onClick={() =>
                setQuickFilter("joined")
              }
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                quickFilter === "joined"
                  ? "bg-teal-700 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Sudah diikuti
            </button>

          </div>
        </section>

        {/* ================================================= */}
        {/* CATEGORY FILTER */}
        {/* ================================================= */}

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-700">
            Kategori
          </h2>

          {loading ? (
            <p className="mt-3 text-sm text-gray-500">
              Memuat kategori...
            </p>
          ) : (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">

              {/* Semua */}
              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(null)
                }
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  selectedCategory === null
                    ? "bg-teal-700 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                Semua
              </button>

              {/* Categories */}
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(category.id)
                  }
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    selectedCategory === category.id
                      ? "bg-teal-700 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {category.icon}{" "}
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ================================================= */}
        {/* ACTIVITIES */}
        {/* ================================================= */}

        <section className="mt-8">

          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Aktivitas
            </h2>

            <span className="text-sm text-gray-500">
              {filteredActivities.length} aktivitas
            </span>
          </div>

          {/* Loading */}
          {loading ? (
            <p className="mt-4 text-gray-500">
              Memuat aktivitas...
            </p>
          ) : error ? (
            /* Error */
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : filteredActivities.length === 0 ? (
            /* Empty */
            <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow-sm">

              <p className="font-medium text-gray-900">
                Aktivitas tidak ditemukan.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Coba gunakan kata kunci atau filter lain.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory(null);
                  setQuickFilter("all");
                }}
                className="mt-5 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800"
              >
                Reset Filter
              </button>

            </div>
          ) : (
            /* Activity List */
            <div className="mt-4 grid gap-4 sm:grid-cols-2">

              {filteredActivities.map(
                (activity) => (
                  <article
                    key={activity.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >

                    {/* ===================================== */}
                    {/* CATEGORY + JOINED */}
                    {/* ===================================== */}

                    <div className="flex items-center justify-between gap-3">

                      <div className="text-sm font-medium text-teal-700">
                        {activity.categories?.[0]?.icon}{" "}
                        {activity.categories?.[0]?.name}
                      </div>

                      {activity.is_joined && (
                        <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          ✓ Joined
                        </span>
                      )}

                    </div>

                    {/* ===================================== */}
                    {/* TITLE */}
                    {/* ===================================== */}

                    <h3 className="mt-2 text-xl font-bold text-gray-900">
                      {activity.title}
                    </h3>

                    {/* ===================================== */}
                    {/* DESCRIPTION */}
                    {/* ===================================== */}

                    {activity.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                        {activity.description}
                      </p>
                    )}

                    {/* ===================================== */}
                    {/* DATE */}
                    {/* ===================================== */}

                    <div className="mt-4 text-sm text-gray-700">
                      📅{" "}
                      {formatDate(
                        activity.start_at,
                      )}
                    </div>

                    {/* ===================================== */}
                    {/* LOCATION */}
                    {/* ===================================== */}

                    <div className="mt-2 text-sm text-gray-700">
                      📍 {activity.location}
                    </div>

                    {/* ===================================== */}
                    {/* CAPACITY */}
                    {/* ===================================== */}

                    <div className="mt-2 text-sm text-gray-500">
                      👥{" "}
                      {activity.participant_count}{" "}
                      / {activity.capacity} peserta
                    </div>

                    {/* ===================================== */}
                    {/* CTA */}
                    {/* ===================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/activity/${activity.id}`,
                        )
                      }
                      className={`mt-5 w-full rounded-xl px-4 py-3 font-semibold transition ${
                        activity.is_joined
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-teal-700 text-white hover:bg-teal-800"
                      }`}
                    >
                      {activity.is_joined
                        ? "✓ Sudah Bergabung"
                        : "Lihat Aktivitas"}
                    </button>

                  </article>
                ),
              )}

            </div>
          )}

        </section>
      </div>
    </main>
  );
}