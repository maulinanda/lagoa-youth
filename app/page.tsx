"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Activity = {
  id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string;
  capacity: number;
  categories:
    | {
        name: string;
        icon: string | null;
      }[]
    | null;
};

type ParticipantCount = {
  activity_id: number;
  participant_count: number;
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export default function Home() {
  const supabase = createClient();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [participantCounts, setParticipantCounts] = useState<
    Record<number, number>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      setLoading(true);

      const { data, error } = await supabase
        .from("activities")
        .select(`
          id,
          title,
          description,
          start_at,
          end_at,
          location,
          capacity,
          categories (
            name,
            icon
          )
        `)
        .eq("status", "published")
        .order("start_at", { ascending: true })
        .limit(3);

      if (error) {
        console.error("Gagal mengambil aktivitas:", error);
        setLoading(false);
        return;
      }

      const loadedActivities = (data ?? []) as Activity[];

      setActivities(loadedActivities);

      if (loadedActivities.length > 0) {
        const activityIds = loadedActivities.map(
          (activity) => activity.id,
        );

        const { data: counts, error: countError } =
          await supabase.rpc("get_activity_participant_counts", {
            p_activity_ids: activityIds,
          });

        if (countError) {
          console.error(
            "Gagal mengambil jumlah peserta:",
            countError,
          );
        } else {
          const countMap: Record<number, number> = {};

          ((counts ?? []) as ParticipantCount[]).forEach((item) => {
            countMap[item.activity_id] = Number(
              item.participant_count,
            );
          });

          setParticipantCounts(countMap);
        }
      }

      setLoading(false);
    }

    loadActivities();
  }, []);

  return (
    <main className="min-h-screen bg-[#F8FAF9] text-[#17211F]">

      {/* =====================================================
          HEADER
          ===================================================== */}
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-8">

          <Link
            href="/"
            className="text-lg font-bold text-teal-700"
          >
            Lagoa Youth
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Masuk
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Daftar
            </Link>
          </div>

        </div>
      </header>

      {/* =====================================================
          HERO
          ===================================================== */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:px-8 sm:py-20">

        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">

          {/* Hero Text */}
          <div>

            <div className="mb-6 inline-flex items-center rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700">
              🌱 Community for Lagoa Youth
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              Aktif.
              <br />
              Kreatif.
              <br />
              Berdampak.
            </h1>

            <h2 className="mt-6 text-2xl font-bold leading-snug text-gray-900 sm:text-3xl">
              Temukan aktivitas.
              <br />
              Temukan teman.
              <br />
              Tumbuh bersama.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
              Lagoa Youth membantu pemuda Lagoa menemukan aktivitas,
              bergabung dengan kegiatan, dan terhubung dengan
              orang-orang yang memiliki minat yang sama.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

              <Link
                href="/discover"
                className="rounded-xl bg-teal-700 px-6 py-3 text-center font-semibold text-white transition hover:bg-teal-800"
              >
                Temukan Aktivitas
              </Link>

              <Link
                href="/create"
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-center font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Buat Aktivitas
              </Link>

            </div>

            <p className="mt-5 text-sm text-gray-500">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="font-semibold text-teal-700 hover:text-teal-800"
              >
                Daftar sekarang
              </Link>
            </p>

          </div>

          {/* Hero Activity Preview */}
          <div className="relative">

            <div className="rounded-3xl bg-teal-700 p-5 shadow-xl sm:p-6">

              <div className="mb-4 flex items-center justify-between">

                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  Aktivitas di Lagoa
                </span>

                <span className="text-sm text-teal-100">
                  ✦ Komunitas
                </span>

              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">

                {loading ? (
                  <div className="py-10 text-center text-sm text-gray-500">
                    Memuat aktivitas...
                  </div>
                ) : activities.length > 0 ? (
                  <div>

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="text-3xl">
                          {activities[0].categories?.[0]?.icon || "🎯"}
                        </div>

                        <h3 className="mt-4 text-xl font-bold text-gray-900">
                          {activities[0].title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {activities[0].description ||
                            "Aktivitas bersama komunitas Lagoa."}
                        </p>

                      </div>

                      <span className="shrink-0 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                        Terbuka
                      </span>

                    </div>

                    <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">

                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span>📅</span>
                        <span>
                          {formatDate(activities[0].start_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span>🕐</span>
                        <span>
                          {formatTime(activities[0].start_at)} –{" "}
                          {formatTime(activities[0].end_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span>📍</span>
                        <span>{activities[0].location}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <span>👥</span>
                        <span>
                          {participantCounts[activities[0].id] || 0} /{" "}
                          {activities[0].capacity} peserta
                        </span>
                      </div>

                    </div>

                    <Link
                      href={`/activity/${activities[0].id}`}
                      className="mt-6 block rounded-xl bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-800"
                    >
                      Lihat Aktivitas
                    </Link>

                  </div>
                ) : (
                  <div className="py-8 text-center">

                    <div className="text-4xl">🌱</div>

                    <h3 className="mt-4 text-lg font-bold text-gray-900">
                      Belum ada aktivitas
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Jadilah yang pertama membuat aktivitas
                      bersama komunitas Lagoa.
                    </p>

                    <Link
                      href="/create"
                      className="mt-5 inline-block rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white"
                    >
                      Buat Aktivitas
                    </Link>

                  </div>
                )}

              </div>

              <p className="mt-5 text-center text-sm text-teal-50">
                Satu aktivitas bisa menjadi awal dari koneksi baru.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          AKTIVITAS LAINNYA
          ===================================================== */}
      {activities.length > 1 && (
        <section className="border-t border-gray-200 bg-white">

          <div className="mx-auto max-w-5xl px-6 py-14 sm:px-8">

            <div className="flex items-end justify-between gap-4">

              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                  Aktivitas terbaru
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                  Ada kegiatan lain yang bisa kamu ikuti.
                </h2>
              </div>

              <Link
                href="/discover"
                className="hidden text-sm font-semibold text-teal-700 sm:block"
              >
                Lihat semua →
              </Link>

            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">

              {activities.slice(1).map((activity) => (

                <Link
                  key={activity.id}
                  href={`/activity/${activity.id}`}
                  className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <div className="text-2xl">
                        {activity.categories?.[0]?.icon || "🎯"}
                      </div>

                      <h3 className="mt-3 font-bold text-gray-900">
                        {activity.title}
                      </h3>

                    </div>

                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                      Terbuka
                    </span>

                  </div>

                  <div className="mt-5 space-y-2 text-sm text-gray-600">

                    <div>
                      📅 {formatDate(activity.start_at)}
                    </div>

                    <div>
                      🕐 {formatTime(activity.start_at)} –{" "}
                      {formatTime(activity.end_at)}
                    </div>

                    <div>
                      📍 {activity.location}
                    </div>

                    <div className="font-medium text-gray-700">
                      👥 {participantCounts[activity.id] || 0} /{" "}
                      {activity.capacity} peserta
                    </div>

                  </div>

                </Link>

              ))}

            </div>

            <Link
              href="/discover"
              className="mt-6 block text-center text-sm font-semibold text-teal-700 sm:hidden"
            >
              Lihat semua aktivitas →
            </Link>

          </div>

        </section>
      )}

      {/* =====================================================
          PROBLEM / VALUE
          ===================================================== */}
      <section className="border-t border-gray-200 bg-[#F8FAF9]">

        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8">

          <div className="max-w-2xl">

            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Kenapa Lagoa Youth?
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Kadang bukan tidak ada kegiatan.
            </h2>

            <p className="mt-4 text-lg leading-8 text-gray-600">
              Kita hanya tidak tahu ada kegiatan apa, kapan
              dilaksanakan, siapa yang ikut, atau bagaimana cara
              bergabung.
            </p>

            <p className="mt-4 leading-7 text-gray-600">
              Lagoa Youth hadir untuk membuat informasi aktivitas
              dan kesempatan untuk terhubung menjadi lebih mudah
              ditemukan.
            </p>

          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="text-3xl">🔎</div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">
                Temukan
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Temukan aktivitas yang sesuai dengan minatmu.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="text-3xl">🤝</div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">
                Terhubung
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Bertemu dan melakukan aktivitas bersama orang lain.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="text-3xl">🚀</div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">
                Berkembang
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Bangun pengalaman dan tumbuh bersama komunitas.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          HOW IT WORKS
          ===================================================== */}
      <section className="bg-white">

        <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8">

          <div className="max-w-2xl">

            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              Cara kerja
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Mulai dari hal sederhana.
            </h2>

            <p className="mt-4 leading-7 text-gray-600">
              Tidak perlu proses yang rumit untuk mulai ikut
              aktivitas bersama komunitas.
            </p>

          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">

            <div className="rounded-2xl bg-[#F8FAF9] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 font-bold text-white">
                01
              </div>

              <h3 className="mt-5 text-lg font-bold text-gray-900">
                Temukan
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Cari aktivitas berdasarkan minat, jadwal, dan lokasi.
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8FAF9] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 font-bold text-white">
                02
              </div>

              <h3 className="mt-5 text-lg font-bold text-gray-900">
                Gabung
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Lihat detail kegiatan dan bergabung dengan aktivitas
                yang kamu pilih.
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8FAF9] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 font-bold text-white">
                03
              </div>

              <h3 className="mt-5 text-lg font-bold text-gray-900">
                Bertemu & Berkembang
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Datang, beraktivitas, bertemu orang baru, dan tumbuh
                bersama komunitas.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          CTA
          ===================================================== */}
      <section className="bg-teal-700">

        <div className="mx-auto max-w-5xl px-6 py-16 text-center sm:px-8">

          <h2 className="text-3xl font-bold text-white">
            Yuk, mulai dari satu aktivitas.
          </h2>

          <p className="mx-auto mt-3 max-w-xl leading-7 text-teal-50">
            Tidak harus menunggu komunitas besar. Satu aktivitas
            bisa menjadi awal untuk bertemu orang baru.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">

            <Link
              href="/discover"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-teal-700 transition hover:bg-gray-100"
            >
              Lihat Aktivitas
            </Link>

            <Link
              href="/register"
              className="rounded-xl border border-teal-300 px-6 py-3 font-semibold text-white transition hover:bg-teal-600"
            >
              Daftar di Lagoa Youth
            </Link>

          </div>

        </div>

      </section>

      {/* =====================================================
          FOOTER
          ===================================================== */}
      <footer className="border-t border-teal-800 bg-teal-700">

        <div className="mx-auto max-w-5xl px-6 py-6 text-center sm:px-8">

          <p className="text-sm text-teal-100">
            Lagoa Youth — Aktif. Kreatif. Berdampak.
          </p>

        </div>

      </footer>

    </main>
  );
}