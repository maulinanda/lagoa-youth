
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type CommunityPost = {
  id: string;
  type: "announcement" | "job";
  title: string;
  description: string;
  image_url: string | null;
  whatsapp_number: string | null;
  external_url: string | null;
  contact_url: string | null;
  location: string | null;
  expires_at: string | null;
  created_at: string;
};

function getWhatsAppUrl(value: string | null): string | null {
  if (!value) return null;

  // Mendukung nomor baru dan data lama yang mungkin berupa URL.
  const trimmed = value.trim();

  if (/^https:\/\/wa\.me\/\d+\/?$/i.test(trimmed)) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return null;

  return `https://wa.me/${digits}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function InformationPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      setLoading(true);
      setError("");

      let query = supabase
        .from("community_posts")
        .select(
          "id, type, title, description, image_url, whatsapp_number, external_url, contact_url, location, expires_at, created_at",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("type", filter);
      }

      const { data, error: queryError } = await query;

      if (!active) return;

      if (queryError) {
        console.error(queryError);
        setError("Gagal memuat informasi. Silakan coba lagi.");
        setPosts([]);
        setLoading(false);
        return;
      }

      const allPosts = (data ?? []) as CommunityPost[];

      function updateActivePosts() {
        if (!active) return;

        const now = Date.now();

        // Tampilkan postingan yang belum kedaluwarsa
        // atau tidak memiliki tanggal kedaluwarsa.
        const activePosts = allPosts.filter((post) => {
          if (!post.expires_at) return true;

          const expiryTime = new Date(post.expires_at).getTime();

          // Tanggal kedaluwarsa yang tidak valid tidak ditampilkan.
          if (Number.isNaN(expiryTime)) return false;

          return expiryTime > now;
        });

        setPosts(activePosts);

        // Bersihkan timer sebelumnya.
        if (expiryTimer) {
          clearTimeout(expiryTimer);
        }

        // Cari waktu kedaluwarsa terdekat yang masih akan datang.
        const nextExpiry = allPosts
          .map((post) => {
            if (!post.expires_at) return Infinity;

            const expiryTime = new Date(post.expires_at).getTime();

            return Number.isNaN(expiryTime)
              ? Infinity
              : expiryTime;
          })
          .filter((expiryTime) => expiryTime > now)
          .sort((a, b) => a - b)[0];

        // Jadwalkan penyaringan ulang saat kedaluwarsa tiba.
        if (
          nextExpiry !== undefined &&
          nextExpiry !== Infinity
        ) {
          const delay = Math.min(
            nextExpiry - now + 50,
            2_147_000_000,
          );

          expiryTimer = setTimeout(updateActivePosts, delay);
        }
      }

      updateActivePosts();
      setLoading(false);
    }

    load();

    return () => {
      active = false;

      if (expiryTimer) {
        clearTimeout(expiryTimer);
      }
    };
  }, [filter, reloadKey]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            LAGOA YOUTH COMMUNITY
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Papan Informasi
          </h1>

          <p className="mt-2 max-w-xl text-gray-600">
            Temukan pengumuman komunitas dan peluang kerja
            yang dibagikan warga Lagoa.
          </p>
        </div>

        <Link
          href="/information/create"
          className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
        >
          + Bagikan Informasi
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {[
          { value: "all", label: "Semua" },
          { value: "announcement", label: "Pengumuman" },
          { value: "job", label: "Lowongan Kerja" },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              filter === item.value
                ? "border-black bg-black text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="py-12 text-center text-gray-500">
          Memuat informasi...
        </p>
      )}

      {!loading && error && (
        <div
          role="alert"
          className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-2 font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">
            Belum ada informasi
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Jadilah yang pertama membagikan informasi
            untuk komunitas Lagoa.
          </p>

          <Link
            href="/information/create"
            className="mt-5 inline-block font-semibold underline"
          >
            Bagikan informasi pertama
          </Link>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const whatsappUrl = getWhatsAppUrl(
              post.whatsapp_number,
            );

            // Kompatibilitas untuk postingan lama.
            const legacyContactUrl =
              !post.external_url && !post.whatsapp_number
                ? post.contact_url
                : null;

            return (
              <article
                key={post.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white"
              >
                {post.image_url && (
                  <a
                    href={post.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Lihat poster ${post.title}`}
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt={`Poster: ${post.title}`}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div>
                    <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {post.type === "job"
                        ? "Lowongan Kerja"
                        : "Pengumuman"}
                    </span>

                    <h2 className="mt-3 text-lg font-bold">
                      {post.title}
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                      {post.description}
                    </p>

                    {post.location && (
                      <p className="mt-3 text-sm text-gray-500">
                        <span aria-hidden="true">📍 </span>
                        {post.location}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-gray-400">
                      Dipublikasikan{" "}
                      {formatDate(post.created_at)}
                    </p>

                    {post.expires_at && (
                      <p className="mt-1 text-xs text-gray-500">
                        Berlaku sampai{" "}
                        {formatDate(post.expires_at)}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto space-y-2 pt-5">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        WhatsApp
                        <span
                          className="ml-2"
                          aria-hidden="true"
                        >
                          ↗
                        </span>
                      </a>
                    )}

                    {post.external_url && (
                      <a
                        href={post.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                      >
                        Buka Link
                        <span
                          className="ml-2"
                          aria-hidden="true"
                        >
                          ↗
                        </span>
                      </a>
                    )}

                    {legacyContactUrl && (
                      <a
                        href={legacyContactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold hover:bg-gray-50"
                      >
                        Hubungi / Lihat Informasi
                        <span
                          className="ml-2"
                          aria-hidden="true"
                        >
                          ↗
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs leading-5 text-gray-500">
        Informasi dibagikan oleh pengguna komunitas. Periksa
        kebenaran informasi dan jangan mengirim uang atau data
        pribadi sensitif kepada pihak yang belum terverifikasi.
      </p>
    </main>
  );
}
