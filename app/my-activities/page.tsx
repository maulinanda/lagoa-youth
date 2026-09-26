"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Activity = {
  id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string;
  capacity: number;
  organizer_id?: string;
  status: string;
  cancel_reason: string | null;
  categories: {
    name: string;
    icon: string | null;
  }[] | null;
};

type Participation = {
  status: string;
  joined_at: string;
  activities: Activity[] | null;
};

type CreatedActivity = Activity & {
  participant_count: number;
};

type ViewType = "joined" | "created";

type ActivityFilter =
  | "upcoming"
  | "history"
  | "cancelled";

const supabase = createClient();

// =========================================================
// SUSPENSE FALLBACK
// =========================================================

function MyActivitiesLoading() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 pb-28">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            Memuat aktivitas...
          </p>
        </div>
      </div>
    </main>
  );
}

// =========================================================
// MAIN PAGE WRAPPER
// =========================================================

export default function MyActivitiesPage() {
  return (
    <Suspense fallback={<MyActivitiesLoading />}>
      <MyActivitiesContent />
    </Suspense>
  );
}

// =========================================================
// MAIN CONTENT
// =========================================================

function MyActivitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // =========================================================
  // VIEW
  // =========================================================

  const viewParam =
    searchParams.get("view");

  const currentView: ViewType =
    viewParam === "created"
      ? "created"
      : "joined";

  const hasSelectedView =
    viewParam === "joined" ||
    viewParam === "created";

  // =========================================================
  // FILTER
  // =========================================================

  const filterParam =
    searchParams.get("status");

  const currentFilter: ActivityFilter =
    filterParam === "history"
      ? "history"
      : filterParam === "cancelled"
        ? "cancelled"
        : "upcoming";

  // =========================================================
  // DATA
  // =========================================================

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [
    createdActivities,
    setCreatedActivities,
  ] = useState<CreatedActivity[]>([]);

  // =========================================================
  // STATE
  // =========================================================

  const [loading, setLoading] =
    useState(true);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    async function loadMyActivities() {
      setError("");
      setCheckingAuth(true);
      setLoading(true);

      // =====================================================
      // CEK LOGIN
      // =====================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);

      // =====================================================
      // AKTIVITAS YANG SAYA IKUTI
      // =====================================================

      const {
        data: participationDataRaw,
        error: participationError,
      } = await supabase
        .from("activity_participants")
        .select(`
          status,
          joined_at,
          activities (
            id,
            title,
            description,
            start_at,
            end_at,
            location,
            capacity,
            status,
            cancel_reason,
            categories (
              name,
              icon
            )
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("joined_at", {
          ascending: false,
        });

      if (participationError) {
        console.error(
          participationError,
        );

        setError(
          "Gagal memuat aktivitas kamu.",
        );

        setLoading(false);
        return;
      }

      const participationData =
        (participationDataRaw ??
          []) as Participation[];

      const myActivities =
        participationData.flatMap(
          (item) =>
            item.activities ?? [],
        );

      setActivities(myActivities);

      // =====================================================
      // AKTIVITAS YANG SAYA BUAT
      // =====================================================

      const {
        data: createdData,
        error: createdError,
      } = await supabase
        .from("activities")
        .select(`
          id,
          title,
          description,
          start_at,
          end_at,
          location,
          capacity,
          organizer_id,
          status,
          cancel_reason,
          categories (
            name,
            icon
          )
        `)
        .eq("organizer_id", user.id)
        .order("start_at", {
          ascending: true,
        });

      if (createdError) {
        console.error(
          createdError,
        );

        setError(
          "Gagal memuat aktivitas yang kamu buat.",
        );

        setLoading(false);
        return;
      }

      // =====================================================
      // HITUNG JUMLAH PESERTA
      // =====================================================

      const activitiesWithCount =
        await Promise.all(
          (createdData ?? []).map(
            async (activity) => {
              const {
                count,
                error: countError,
              } = await supabase
                .from(
                  "activity_participants",
                )
                .select("*", {
                  count: "exact",
                  head: true,
                })
                .eq(
                  "activity_id",
                  activity.id,
                )
                .in("status", [
                  "joined",
                  "attended",
                ]);

              if (countError) {
                console.error(
                  countError,
                );
              }

              return {
                ...activity,
                participant_count:
                  count ?? 0,
              };
            },
          ),
        );

      setCreatedActivities(
        activitiesWithCount,
      );

      setLoading(false);
    }

    loadMyActivities();
  }, [router]);

  // =========================================================
  // NAVIGASI KE VIEW
  // =========================================================

  function openView(
    view: ViewType,
  ) {
    router.push(
      `/my-activities?view=${view}&status=upcoming`,
    );
  }

  function changeFilter(
    filter: ActivityFilter,
  ) {
    router.push(
      `/my-activities?view=${currentView}&status=${filter}`,
    );
  }

  function goBack() {
    router.push("/my-activities");
  }

  // =========================================================
  // FORMAT TANGGAL
  // =========================================================

  function formatDate(
    dateString: string,
  ) {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(
      new Date(dateString),
    );
  }

  // =========================================================
  // WAKTU SEKARANG
  // =========================================================

  const now = new Date();

  // =========================================================
  // AKTIVITAS YANG SAYA IKUTI
  // =========================================================

  const upcomingJoined =
    activities.filter(
      (activity) => {
        const endAt = new Date(
          activity.end_at,
        );

        return (
          endAt > now &&
          activity.status !==
            "cancelled"
        );
      },
    );

  const historyJoined =
    activities.filter(
      (activity) => {
        const endAt = new Date(
          activity.end_at,
        );

        return (
          endAt <= now &&
          activity.status !==
            "cancelled"
        );
      },
    );

  const cancelledJoined =
    activities.filter(
      (activity) =>
        activity.status ===
        "cancelled",
    );

  // =========================================================
  // AKTIVITAS YANG SAYA BUAT
  // =========================================================

  const upcomingCreated =
    createdActivities.filter(
      (activity) => {
        const endAt = new Date(
          activity.end_at,
        );

        return (
          endAt > now &&
          activity.status !==
            "cancelled"
        );
      },
    );

  const historyCreated =
    createdActivities.filter(
      (activity) => {
        const endAt = new Date(
          activity.end_at,
        );

        return (
          endAt <= now &&
          activity.status !==
            "cancelled"
        );
      },
    );

  const cancelledCreated =
    createdActivities.filter(
      (activity) =>
        activity.status ===
        "cancelled",
    );

  // =========================================================
  // DATA YANG DITAMPILKAN
  // =========================================================

  const displayedActivities =
    currentView === "joined"
      ? currentFilter === "upcoming"
        ? upcomingJoined
        : currentFilter ===
            "history"
          ? historyJoined
          : cancelledJoined
      : currentFilter === "upcoming"
        ? upcomingCreated
        : currentFilter ===
            "history"
          ? historyCreated
          : cancelledCreated;

  // =========================================================
  // JUMLAH PER FILTER
  // =========================================================

  const counts =
    currentView === "joined"
      ? {
          upcoming:
            upcomingJoined.length,
          history:
            historyJoined.length,
          cancelled:
            cancelledJoined.length,
        }
      : {
          upcoming:
            upcomingCreated.length,
          history:
            historyCreated.length,
          cancelled:
            cancelledCreated.length,
        };

  // =========================================================
  // JUDUL VIEW
  // =========================================================

  const pageTitle =
    currentView === "joined"
      ? "Aktivitas yang Saya Ikuti"
      : "Aktivitas yang Saya Buat";

  // =========================================================
  // LOADING DATA
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 pb-28">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              Memuat aktivitas...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // MASIH CEK LOGIN
  // =========================================================

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 pb-28">
        <div className="mx-auto max-w-5xl">
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
  // HALAMAN UTAMA
  // =========================================================

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 pb-28">
      <div className="mx-auto max-w-5xl">

        {/* ================================================= */}
        {/* MENU UTAMA */}
        {/* ================================================= */}

        {!hasSelectedView ? (
          <>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Aktivitas Saya
              </h1>

              <p className="mt-2 text-gray-600">
                Pilih aktivitas yang ingin kamu lihat.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {/* AKTIVITAS YANG SAYA IKUTI */}

              <button
                type="button"
                onClick={() =>
                  openView("joined")
                }
                className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
                  📅
                </div>

                <h2 className="mt-5 text-xl font-bold text-gray-900">
                  Aktivitas yang Saya Ikuti
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Lihat aktivitas yang kamu ikuti
                  sebagai peserta.
                </p>

                <div className="mt-5 font-semibold text-teal-700">
                  Lihat Aktivitas →
                </div>
              </button>

              {/* AKTIVITAS YANG SAYA BUAT */}

              <button
                type="button"
                onClick={() =>
                  openView("created")
                }
                className="group rounded-2xl bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
                  ✏️
                </div>

                <h2 className="mt-5 text-xl font-bold text-gray-900">
                  Aktivitas yang Saya Buat
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Lihat dan kelola aktivitas yang
                  kamu buat sebagai organizer.
                </p>

                <div className="mt-5 font-semibold text-teal-700">
                  Kelola Aktivitas →
                </div>
              </button>

            </div>

          </>
        ) : (

          /* ================================================= */
          /* HALAMAN LIST AKTIVITAS */
          /* ================================================= */

          <>

            <button
              type="button"
              onClick={goBack}
              className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
              ← Kembali
            </button>

            <div className="mt-5">
              <h1 className="text-3xl font-bold text-gray-900">
                {pageTitle}
              </h1>

              <p className="mt-2 text-gray-600">
                {currentView ===
                "joined"
                  ? "Aktivitas yang kamu ikuti sebagai peserta."
                  : "Aktivitas yang kamu buat sebagai organizer."}
              </p>
            </div>

            {/* FILTER */}

            <div className="mt-7 flex rounded-xl bg-gray-100 p-1">

              {/* AKAN DATANG */}

              <button
                type="button"
                onClick={() =>
                  changeFilter(
                    "upcoming",
                  )
                }
                className={`flex-1 rounded-lg px-2 py-2.5 text-sm font-semibold transition ${
                  currentFilter ===
                  "upcoming"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Akan Datang

                <span className="ml-1">
                  ({counts.upcoming})
                </span>
              </button>

              {/* RIWAYAT */}

              <button
                type="button"
                onClick={() =>
                  changeFilter(
                    "history",
                  )
                }
                className={`flex-1 rounded-lg px-2 py-2.5 text-sm font-semibold transition ${
                  currentFilter ===
                  "history"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Riwayat

                <span className="ml-1">
                  ({counts.history})
                </span>
              </button>

              {/* DIBATALKAN */}

              <button
                type="button"
                onClick={() =>
                  changeFilter(
                    "cancelled",
                  )
                }
                className={`flex-1 rounded-lg px-2 py-2.5 text-sm font-semibold transition ${
                  currentFilter ===
                  "cancelled"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Dibatalkan

                <span className="ml-1">
                  ({counts.cancelled})
                </span>
              </button>

            </div>

            {/* EMPTY STATE */}

            {displayedActivities.length ===
            0 ? (
              <div className="mt-5 rounded-2xl bg-white p-8 text-center shadow-sm">

                {currentFilter ===
                "upcoming" ? (
                  <>
                    <div className="text-4xl">
                      📅
                    </div>

                    <p className="mt-4 font-medium text-gray-900">
                      Belum ada aktivitas mendatang.
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {currentView ===
                      "joined"
                        ? "Yuk temukan aktivitas yang menarik di Lagoa."
                        : "Buat aktivitas pertama untuk komunitas Lagoa."}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          currentView ===
                            "joined"
                            ? "/discover"
                            : "/create",
                        )
                      }
                      className="mt-5 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white transition hover:bg-teal-800"
                    >
                      {currentView ===
                      "joined"
                        ? "Cari Aktivitas"
                        : "Buat Aktivitas"}
                    </button>
                  </>
                ) : currentFilter ===
                  "history" ? (
                  <>
                    <div className="text-4xl">
                      📚
                    </div>

                    <p className="mt-4 font-medium text-gray-900">
                      Belum ada riwayat aktivitas.
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Aktivitas yang sudah selesai
                      akan muncul di sini.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl">
                      🚫
                    </div>

                    <p className="mt-4 font-medium text-gray-900">
                      Belum ada aktivitas yang dibatalkan.
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Aktivitas yang dibatalkan
                      akan muncul di sini.
                    </p>
                  </>
                )}

              </div>
            ) : (

              /* ACTIVITY LIST */

              <div className="mt-5 grid gap-4 sm:grid-cols-2">

                {displayedActivities.map(
                  (activity) => {

                    const isCancelled =
                      activity.status ===
                      "cancelled";

                    const isFinished =
                      new Date(
                        activity.end_at,
                      ) <= now;

                    const isOngoing =
                      new Date(
                        activity.start_at,
                      ) <= now &&
                      new Date(
                        activity.end_at,
                      ) > now;

                    return (
                      <article
                        key={
                          activity.id
                        }
                        className={`rounded-2xl bg-white p-5 shadow-sm ${
                          isCancelled
                            ? "opacity-90"
                            : ""
                        }`}
                      >

                        {/* CATEGORY + STATUS */}

                        <div className="flex items-center justify-between gap-3">

                          <div
                            className={`text-sm font-medium ${
                              isCancelled
                                ? "text-gray-500"
                                : "text-teal-700"
                            }`}
                          >
                            {
                              activity
                                .categories?.[0]
                                ?.icon
                            }{" "}

                            {
                              activity
                                .categories?.[0]
                                ?.name
                            }
                          </div>

                          {isCancelled ? (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                              Dibatalkan
                            </span>
                          ) : isFinished ? (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                              ✓ Selesai
                            </span>
                          ) : isOngoing ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              🟢 Berlangsung
                            </span>
                          ) : currentView ===
                            "joined" ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              ✓ Joined
                            </span>
                          ) : (
                            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                              Organizer
                            </span>
                          )}

                        </div>

                        {/* TITLE */}

                        <h3 className="mt-2 text-xl font-bold text-gray-900">
                          {
                            activity.title
                          }
                        </h3>

                        {/* DESCRIPTION */}

                        {activity.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                            {
                              activity.description
                            }
                          </p>
                        )}

                        {/* DATE */}

                        <div className="mt-4 text-sm text-gray-700">
                          📅{" "}
                          {formatDate(
                            activity.start_at,
                          )}
                        </div>

                        {/* LOCATION */}

                        <div className="mt-2 text-sm text-gray-700">
                          📍{" "}
                          {
                            activity.location
                          }
                        </div>

                        {/* PARTICIPANTS */}

                        {currentView ===
                          "created" && (
                          <div className="mt-3 text-sm font-medium text-gray-700">
                            👥{" "}
                            {
                              (
                                activity as CreatedActivity
                              )
                                .participant_count
                            }{" "}
                            /{" "}
                            {
                              activity.capacity
                            }{" "}
                            peserta
                          </div>
                        )}

                        {/* CANCEL REASON */}

                        {isCancelled && (
                          <div className="mt-4 rounded-xl bg-red-50 p-4">

                            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                              Alasan pembatalan
                            </p>

                            <p className="mt-1 text-sm leading-6 text-red-700">
                              {
                                activity.cancel_reason ||
                                "Tidak ada alasan yang diberikan."
                              }
                            </p>

                          </div>
                        )}

                        {/* BUTTON */}

                        {isCancelled ? (
                          <div className="mt-5 w-full rounded-xl bg-gray-100 px-4 py-3 text-center font-semibold text-gray-500">
                            ⚠ Aktivitas Dibatalkan
                          </div>
                        ) : currentView ===
                          "joined" ? (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/activity/${activity.id}`,
                              )
                            }
                            className="mt-5 w-full rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-200"
                          >
                            {isFinished
                              ? "Lihat Riwayat"
                              : "Lihat Aktivitas"}
                          </button>
                        ) : isFinished ? (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/activity/${activity.id}`,
                              )
                            }
                            className="mt-5 w-full rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-200"
                          >
                            Lihat Rekap
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/activity/${activity.id}`,
                              )
                            }
                            className="mt-5 w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800"
                          >
                            Kelola Aktivitas
                          </button>
                        )}

                      </article>
                    );
                  },
                )}

              </div>
            )}

          </>
        )}

      </div>
    </main>
  );
}