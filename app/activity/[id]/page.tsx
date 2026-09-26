"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Activity = {
  id: number;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string;
  capacity: number;
  organizer_id: string;
  categories: {
    name: string;
    icon: string | null;
  }[] | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    area: string | null;
  } | null;
};

type Participant = {
  id: number;
  user_id: string;
  status: string;
  joined_at: string;
  profile: {
    full_name: string;
    area: string | null;
  } | null;
};

type ParticipantCount = {
  activity_id: number;
  participant_count: number;
};

type JoinActivityResult = {
  success: boolean;
  message: string;
  participant_status: string | null;
  participant_count: number;
  capacity: number;
};

const supabase = createClient();

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();

  const activityId = params.id as string;

  const [activity, setActivity] =
    useState<Activity | null>(null);

  const [participantCount, setParticipantCount] =
    useState(0);

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null);

  const [hasJoined, setHasJoined] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [joining, setJoining] =
    useState(false);

  const [cancelling, setCancelling] =
    useState(false);

  const [error, setError] =
    useState("");

  // =========================================================
  // LOAD ACTIVITY
  // =========================================================

  useEffect(() => {
    async function loadActivity() {
      if (!activityId) return;

      setError("");
      setLoading(true);

      // =====================================================
      // AMBIL USER YANG SEDANG LOGIN
      // =====================================================

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
      } else {
        setCurrentUserId(null);
      }

      // =====================================================
      // AMBIL DETAIL AKTIVITAS
      // =====================================================

      const {
        data: activityData,
        error: activityError,
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
          categories (
            name,
            icon
          ),
          profiles:organizer_id (
            full_name,
            avatar_url,
            area
          )
        `)
        .eq("id", activityId)
        .eq("status", "published")
        .single();

      if (activityError || !activityData) {
        console.error(
          "ACTIVITY ERROR:",
          activityError,
        );

        setError("Aktivitas tidak ditemukan.");
        setLoading(false);
        return;
      }

      const normalizedActivity: Activity = {
        ...activityData,
        profiles:
          Array.isArray(activityData.profiles)
            ? activityData.profiles[0] ?? null
            : activityData.profiles ?? null,
      };

      setActivity(normalizedActivity);

      // =====================================================
      // CEK APAKAH USER SUDAH JOIN
      // =====================================================

      if (user) {
        const {
          data: participation,
          error: participationError,
        } = await supabase
          .from("activity_participants")
          .select("id, status")
          .eq("activity_id", activityId)
          .eq("user_id", user.id)
          .in("status", ["joined", "attended"])
          .maybeSingle();

        if (participationError) {
          console.error(
            "PARTICIPATION ERROR:",
            participationError,
          );
        }

        setHasJoined(!!participation);
      } else {
        setHasJoined(false);
      }

      // =====================================================
      // AMBIL JUMLAH PESERTA MELALUI RPC
      // =====================================================

      const {
        data: countData,
        error: countError,
      } = await supabase.rpc(
        "get_activity_participant_counts",
        {
          p_activity_ids: [activityData.id],
        },
      );

      if (countError) {
        console.error(
          "COUNT RPC ERROR:",
          countError,
        );

        setParticipantCount(0);
      } else {
        const participantCounts =
          (countData ?? []) as ParticipantCount[];

        const countItem =
          participantCounts.find(
            (item) =>
              Number(item.activity_id) ===
              activityData.id,
          );

        setParticipantCount(
          countItem
            ? Number(
                countItem.participant_count,
              )
            : 0,
        );
      }

      // =====================================================
      // DAFTAR PESERTA ORGANIZER
      //
      // HANYA ORGANIZER YANG BOLEH MELIHAT
      // =====================================================

      if (
        user?.id ===
        activityData.organizer_id
      ) {
        const {
          data: participantData,
          error: participantError,
        } = await supabase
          .from("activity_participants")
          .select(`
            id,
            user_id,
            status,
            joined_at,
            profile:profiles (
              full_name,
              area
            )
          `)
          .eq("activity_id", activityId)
          .in("status", [
            "joined",
            "attended",
          ])
          .order("joined_at", {
            ascending: true,
          });

        if (participantError) {
          console.error(
            "Gagal mengambil daftar peserta:",
            participantError,
          );
        } else {
          const normalizedParticipants: Participant[] =
            (participantData ?? []).map(
              (participant) => ({
                id: participant.id,
                user_id:
                  participant.user_id,
                status:
                  participant.status,
                joined_at:
                  participant.joined_at,
                profile:
                  Array.isArray(
                    participant.profile,
                  )
                    ? participant.profile[0] ??
                      null
                    : participant.profile ??
                      null,
              }),
            );

          setParticipants(
            normalizedParticipants,
          );
        }
      } else {
        setParticipants([]);
      }

      setLoading(false);
    }

    loadActivity();
  }, [activityId]);

  // =========================================================
  // REFRESH JUMLAH PESERTA
  // =========================================================

  async function refreshParticipantCount() {
    if (!activity) return;

    const {
      data: countData,
      error: countError,
    } = await supabase.rpc(
      "get_activity_participant_counts",
      {
        p_activity_ids: [activity.id],
      },
    );

    if (countError) {
      console.error(
        "COUNT RPC ERROR:",
        countError,
      );

      return;
    }

    const participantCounts =
      (countData ?? []) as ParticipantCount[];

    const countItem =
      participantCounts.find(
        (item) =>
          Number(item.activity_id) ===
          activity.id,
      );

    setParticipantCount(
      countItem
        ? Number(
            countItem.participant_count,
          )
        : 0,
    );
  }

  // =========================================================
  // JOIN ACTIVITY
  // =========================================================

  async function handleJoin() {
    if (!activity) return;

    setError("");
    setJoining(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Silakan login terlebih dahulu.",
      );

      setJoining(false);
      return;
    }

    const {
      data,
      error: joinRpcError,
    } = await supabase.rpc(
      "join_activity",
      {
        p_activity_id: activity.id,
      },
    );

    if (joinRpcError) {
      console.error(
        "JOIN RPC ERROR:",
        joinRpcError,
      );

      setError(
        `Gagal bergabung: ${joinRpcError.message}`,
      );

      setJoining(false);
      return;
    }

    const result =
      (data?.[0] ??
        null) as JoinActivityResult | null;

    if (!result) {
      setError(
        "Tidak mendapatkan hasil dari proses join.",
      );

      setJoining(false);
      return;
    }

    setParticipantCount(
      Number(
        result.participant_count ?? 0,
      ),
    );

    if (!result.success) {
      setError(
        result.message ||
          "Gagal bergabung dalam aktivitas.",
      );

      setJoining(false);
      return;
    }

    setHasJoined(true);

    // =====================================================
    // JIKA ORGANIZER
    // REFRESH DAFTAR PESERTA
    // =====================================================

    if (
      user.id ===
      activity.organizer_id
    ) {
      const {
        data: newParticipant,
        error: newParticipantError,
      } = await supabase
        .from("activity_participants")
        .select(`
          id,
          user_id,
          status,
          joined_at,
          profile:profiles (
            full_name,
            area
          )
        `)
        .eq(
          "activity_id",
          activity.id,
        )
        .eq(
          "user_id",
          user.id,
        )
        .single();

      if (newParticipantError) {
        console.error(
          "NEW PARTICIPANT ERROR:",
          newParticipantError,
        );
      }

      if (newParticipant) {
        const normalizedParticipant: Participant =
          {
            id: newParticipant.id,
            user_id:
              newParticipant.user_id,
            status:
              newParticipant.status,
            joined_at:
              newParticipant.joined_at,
            profile:
              Array.isArray(
                newParticipant.profile,
              )
                ? newParticipant
                    .profile[0] ?? null
                : newParticipant
                    .profile ?? null,
          };

        setParticipants(
          (current) => [
            ...current.filter(
              (item) =>
                item.user_id !==
                user.id,
            ),
            normalizedParticipant,
          ],
        );
      }
    }

    setJoining(false);
  }

  // =========================================================
  // MARK PARTICIPANT AS ATTENDED
  // =========================================================

  async function handleMarkAttended(
    participantId: number,
  ) {
    if (
      !activity ||
      currentUserId !== activity.organizer_id
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Tandai peserta ini sebagai hadir?",
      );

    if (!confirmed) return;

    setError("");

    // =====================================================
    // TANDAI HADIR MELALUI RPC
    //
    // Database memastikan bahwa:
    // 1. User adalah organizer
    // 2. Participant memang milik aktivitas tersebut
    // 3. Status diubah menjadi attended
    // 4. attended_at diisi oleh database
    // =====================================================

    const {
      data: attendanceResult,
      error: attendanceError,
    } = await supabase.rpc(
      "mark_activity_participant_attended",
      {
        p_participant_id: participantId,
      },
    );

    if (attendanceError) {
      console.error(
        "ATTENDANCE RPC ERROR:",
        attendanceError,
      );

      setError(
        `Gagal menandai kehadiran: ${attendanceError.message}`,
      );

      return;
    }

    if (!attendanceResult) {
      setError(
        "Peserta tidak ditemukan atau kamu bukan organizer aktivitas ini.",
      );

      return;
    }

    // =====================================================
    // UPDATE UI
    // =====================================================

    setParticipants(
      (current) =>
        current.map(
          (participant) =>
            participant.id ===
            participantId
              ? {
                  ...participant,
                  status: "attended",
                }
              : participant,
        ),
    );
  }

  // =========================================================
  // CANCEL PARTICIPATION
  // =========================================================

  async function handleCancelParticipation() {
    if (!activity) return;

    const confirmed =
      window.confirm(
        "Yakin ingin membatalkan keikutsertaan dari aktivitas ini?",
      );

    if (!confirmed) return;

    setError("");
    setCancelling(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Sesi login tidak ditemukan.",
      );

      setCancelling(false);
      return;
    }

    // =======================================================
    // BATALKAN MELALUI RPC
    //
    // Database mengambil user dari auth.uid().
    // Browser tidak mengirim user_id.
    // =======================================================

    const {
      data: cancelResult,
      error: cancelError,
    } = await supabase.rpc(
      "cancel_activity_participation",
      {
        p_activity_id: activity.id,
      },
    );

    if (cancelError) {
      console.error(
        "CANCEL PARTICIPATION RPC ERROR:",
        cancelError,
      );

      setError(
        `Gagal membatalkan keikutsertaan: ${cancelError.message}`,
      );

      setCancelling(false);
      return;
    }

    // =======================================================
    // DATA TIDAK DITEMUKAN / SUDAH DIBATALKAN
    // =======================================================

    if (!cancelResult) {
      setError(
        "Data keikutsertaan tidak ditemukan atau sudah dibatalkan.",
      );

      setCancelling(false);
      return;
    }

    // =======================================================
    // UPDATE UI
    // =======================================================

    setHasJoined(false);

    await refreshParticipantCount();

    setParticipants(
      (current) =>
        current.filter(
          (item) =>
            item.user_id !==
            user.id,
        ),
    );

    setCancelling(false);
  }

  // =========================================================
  // CANCEL ACTIVITY
  // =========================================================

  async function handleCancelActivity() {
    if (!activity) return;

    const reason =
      window.prompt(
        "Masukkan alasan pembatalan aktivitas:",
      );

    if (reason === null) {
      return;
    }

    const trimmedReason =
      reason.trim();

    if (!trimmedReason) {
      setError(
        "Alasan pembatalan wajib diisi.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Aktivitas akan dibatalkan dengan alasan:\n\n"${trimmedReason}"\n\nLanjutkan?`,
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setCancelling(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError(
        "Sesi login tidak ditemukan.",
      );

      setCancelling(false);
      return;
    }

    const {
      error: cancelError,
    } = await supabase
      .from("activities")
      .update({
        status: "cancelled",
        cancel_reason:
          trimmedReason,
      })
      .eq(
        "id",
        activity.id,
      )
      .eq(
        "organizer_id",
        user.id,
      );

    if (cancelError) {
      console.error(
        "CANCEL ACTIVITY ERROR:",
        cancelError,
      );

      setError(
        `Gagal membatalkan aktivitas: ${cancelError.message}`,
      );

      setCancelling(false);
      return;
    }

    router.push(
      "/my-activities",
    );
  }

  // =========================================================
  // FORMAT DATE
  // =========================================================

  function formatDate(
    dateString: string,
  ) {
    return new Intl.DateTimeFormat(
      "id-ID",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(
      new Date(dateString),
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-gray-500">
            Memuat aktivitas...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // ERROR / ACTIVITY NOT FOUND
  // =========================================================

  if (error && !activity) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="font-medium text-red-600">
              {error}
            </p>

            <button
              onClick={() =>
                router.push(
                  "/discover",
                )
              }
              className="mt-5 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
            >
              Kembali ke Discover
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!activity) {
    return null;
  }

  // =========================================================
  // STATUS AKTIVITAS BERDASARKAN WAKTU
  // =========================================================

  const now = new Date();
  const startAt = new Date(activity.start_at);
  const endAt = new Date(activity.end_at);

  const isUpcoming =
    now < startAt;

  const isOngoing =
    now >= startAt &&
    now < endAt;

  const isCompleted =
    now >= endAt;

  // =========================================================
  // STATUS PESERTA
  // =========================================================

  const isFull =
    participantCount >=
    activity.capacity;

  const isOrganizer =
    currentUserId ===
    activity.organizer_id;

  // =========================================================
  // REKAP KEHADIRAN
  // =========================================================

  const attendedCount =
    participants.filter(
      (participant) =>
        participant.status ===
        "attended",
    ).length;

  const notAttendedCount =
    participants.filter(
      (participant) =>
        participant.status ===
        "joined",
    ).length;

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">

        {/* ================================================= */}
        {/* BACK */}
        {/* ================================================= */}

        <button
          onClick={() =>
            router.push(
              "/discover",
            )
          }
          className="mb-6 text-sm font-medium text-teal-700"
        >
          ← Kembali ke Discover
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0">

              {/* Category */}

              <div className="text-sm font-semibold text-teal-700">
                {activity.categories?.[0]?.icon}{" "}
                {activity.categories?.[0]?.name}
              </div>

              {/* Title */}

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {activity.title}
              </h1>

            </div>

            {/* ================================================= */}
            {/* ORGANIZER ACTION ICONS */}
            {/* ================================================= */}

            {isOrganizer &&
              !isCompleted && (
                <div className="flex shrink-0 items-center gap-1">

                  {/* Edit */}

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/activity/${activity.id}/edit`,
                      )
                    }
                    title="Edit aktivitas"
                    aria-label="Edit aktivitas"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-teal-700"
                  >
                    ✏️
                  </button>

                  {/* Cancel */}

                  <button
                    type="button"
                    onClick={
                      handleCancelActivity
                    }
                    disabled={
                      cancelling
                    }
                    title="Batalkan aktivitas"
                    aria-label="Batalkan aktivitas"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ×
                  </button>

                </div>
              )}

          </div>

          {/* ================================================= */}
          {/* ACTIVITY STATUS */}
          {/* ================================================= */}

          <div className="mt-5">

            {isUpcoming && (
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                Akan datang
              </span>
            )}

            {isOngoing && (
              <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                🟢 Sedang berlangsung
              </span>
            )}

            {isCompleted && (
              <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
                ✓ Aktivitas selesai
              </span>
            )}

          </div>

          {/* ================================================= */}
          {/* REKAP HEADER */}
          {/* Hanya muncul setelah aktivitas selesai. */}
          {/* ================================================= */}

          {isCompleted && (
            <div className="mt-6 rounded-2xl bg-gray-50 p-5">

              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Rekap Aktivitas
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Aktivitas ini telah selesai.
                Berikut adalah informasi dan
                rekap kehadiran peserta.
              </p>

            </div>
          )}

          {/* ================================================= */}
          {/* DESCRIPTION */}
          {/* ================================================= */}

          {activity.description && (
            <p className="mt-5 leading-7 text-gray-600">
              {activity.description}
            </p>
          )}

          {/* ================================================= */}
          {/* INFORMATION */}
          {/* ================================================= */}

          <div className="mt-8 space-y-4 border-t border-gray-100 pt-6">

            {/* Organizer */}

            <div>
              <p className="text-sm text-gray-500">
                Dibuat oleh
              </p>

              <div className="mt-2 flex items-center gap-3">

                {/* Avatar */}

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700">
                  {activity.profiles?.full_name
                    ?.charAt(0)
                    .toUpperCase() || "?"}
                </div>

                {/* Organizer Name */}

                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {activity.profiles?.full_name ||
                      "Organizer"}
                  </p>

                  {activity.profiles?.area && (
                    <p className="text-sm text-gray-500">
                      📍{" "}
                      {activity.profiles.area}
                    </p>
                  )}
                </div>

              </div>
            </div>

            {/* Start */}

            <div>
              <p className="text-sm text-gray-500">
                Waktu mulai
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {formatDate(
                  activity.start_at,
                )}
              </p>
            </div>

            {/* End */}

            <div>
              <p className="text-sm text-gray-500">
                Waktu selesai
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {formatDate(
                  activity.end_at,
                )}
              </p>
            </div>

            {/* Location */}

            <div>
              <p className="text-sm text-gray-500">
                Lokasi
              </p>

              <p className="mt-1 font-medium text-gray-900">
                📍{" "}
                {activity.location}
              </p>
            </div>

            {/* Participants */}

            <div>
              <p className="text-sm text-gray-500">
                Peserta
              </p>

              <p className="mt-1 font-medium text-gray-900">
                👥{" "}
                {participantCount} /{" "}
                {activity.capacity}{" "}
                peserta
              </p>
            </div>

          </div>

          {/* ================================================= */}
          {/* REKAP KEHADIRAN ORGANIZER */}
          {/* Hanya organizer yang mempunyai akses */}
          {/* terhadap daftar peserta. */}
          {/* ================================================= */}

          {isOrganizer &&
            isCompleted && (
              <div className="mt-8 border-t border-gray-100 pt-6">

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Rekap Kehadiran
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Ringkasan kehadiran peserta
                    pada aktivitas ini.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">

                  {/* Hadir */}

                  <div className="rounded-xl bg-green-50 p-4">

                    <p className="text-sm font-medium text-green-700">
                      ✓ Hadir
                    </p>

                    <p className="mt-1 text-2xl font-bold text-green-800">
                      {attendedCount}
                    </p>

                    <p className="text-xs text-green-700">
                      peserta
                    </p>

                  </div>

                  {/* Belum hadir */}

                  <div className="rounded-xl bg-gray-50 p-4">

                    <p className="text-sm font-medium text-gray-600">
                      ○ Belum hadir
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-800">
                      {notAttendedCount}
                    </p>

                    <p className="text-xs text-gray-500">
                      peserta
                    </p>

                  </div>

                </div>

              </div>
            )}

          {/* ================================================= */}
          {/* DAFTAR PESERTA */}
          {/* Organizer:
              - sebelum selesai → bisa menandai hadir
              - setelah selesai → hanya melihat rekap
              */}
          {/* ================================================= */}

          {isOrganizer && (
            <div
              id="participant-section"
              className="mt-8 border-t border-gray-100 pt-6"
            >

              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {isCompleted
                      ? "Daftar Peserta"
                      : "Peserta"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {isCompleted
                      ? "Status kehadiran peserta pada aktivitas ini."
                      : "Orang yang sudah bergabung dalam aktivitas ini."}
                  </p>
                </div>

                <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">
                  {participantCount}
                </span>

              </div>

              {participants.length ===
              0 ? (
                <div className="mt-4 rounded-xl bg-gray-50 p-5 text-center">

                  <p className="text-sm text-gray-500">
                    Belum ada peserta.
                  </p>

                </div>
              ) : (
                <div className="mt-4 space-y-3">

                  {participants.map(
                    (
                      participant,
                      index,
                    ) => (
                      <div
                        key={
                          participant.id
                        }
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3"
                      >

                        {/* Avatar */}

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-700">
                          {participant
                            .profile
                            ?.full_name
                            ?.charAt(
                              0,
                            )
                            .toUpperCase() ||
                            "?"}
                        </div>

                        {/* Name */}

                        <div className="min-w-0">

                          <p className="font-medium text-gray-900">
                            {index + 1}.{" "}
                            {participant
                              .profile
                              ?.full_name ||
                              "User"}
                          </p>

                          {participant
                            .profile
                            ?.area && (
                            <p className="text-sm text-gray-500">
                              {
                                participant
                                  .profile
                                  .area
                              }
                            </p>
                          )}

                        </div>

                        {/* Status */}

                        <div className="ml-auto flex shrink-0 items-center gap-2">

                          {participant.status ===
                          "attended" ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              ✓ Hadir
                            </span>
                          ) : isCompleted ? (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                              ○ Belum hadir
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleMarkAttended(
                                  participant.id,
                                )
                              }
                              className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
                            >
                              Tandai Hadir
                            </button>
                          )}

                        </div>

                      </div>
                    ),
                  )}

                </div>
              )}

            </div>
          )}

          {/* ================================================= */}
          {/* ERROR */}
          {/* ================================================= */}

          {error && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ================================================= */}
          {/* MAIN ACTION */}
          {/* ================================================= */}

          {isOrganizer ? (

            /* ================================================= */
            /* ORGANIZER */
            /* ================================================= */

            isCompleted ? (
              <div className="mt-8 w-full rounded-xl bg-gray-100 px-4 py-3 text-center font-semibold text-gray-600">
                ✓ Rekap Aktivitas
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  document
                    .getElementById(
                      "participant-section",
                    )
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }}
                className="mt-8 w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white transition hover:bg-teal-800"
              >
                Kelola Peserta
              </button>
            )

          ) : hasJoined ? (

            /* ================================================= */
            /* USER SUDAH JOIN */
            /* ================================================= */

            isCompleted ? (
              <div className="mt-8 w-full rounded-xl bg-gray-100 px-4 py-3 text-center font-semibold text-gray-600">
                ✓ Kamu mengikuti aktivitas ini
              </div>
            ) : (
              <div className="mt-8 space-y-3">

                <div className="w-full rounded-xl bg-green-600 px-4 py-3 text-center font-semibold text-white">
                  Joined ✓
                </div>

                <button
                  type="button"
                  onClick={
                    handleCancelParticipation
                  }
                  disabled={
                    cancelling
                  }
                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancelling
                    ? "Membatalkan..."
                    : "Batalkan Keikutsertaan"}
                </button>

              </div>
            )

          ) : (

            /* ================================================= */
            /* USER BELUM JOIN */
            /* ================================================= */

            isCompleted ? (
              <div className="mt-8 w-full rounded-xl bg-gray-100 px-4 py-3 text-center font-semibold text-gray-600">
                ✓ Aktivitas Selesai
              </div>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={
                  joining || isFull
                }
                className={`mt-8 w-full rounded-xl px-4 py-3 font-semibold text-white transition ${
                  isFull
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-teal-700 hover:bg-teal-800"
                }`}
              >
                {joining
                  ? "Bergabung..."
                  : isFull
                    ? "Aktivitas Penuh"
                    : "Join Activity"}
              </button>
            )

          )}

        </div>
      </div>
    </main>
  );
}