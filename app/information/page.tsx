
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type CommunityPost = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  image_url: string | null;
  contact_url: string | null;
  location: string | null;
  expires_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  whatsapp_number: string | null;
  external_url: string | null;
};

function formatType(type: string) {
  const labels: Record<string, string> = {
    event: "Acara",
    activity: "Aktivitas",
    announcement: "Pengumuman",
    promotion: "Promosi",
    information: "Informasi",
  };

  return labels[type.toLowerCase()] ?? type;
}

function formatDate(value: string | null) {
  if (!value) return "Tidak ditentukan";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isNotExpired(expiresAt: string | null) {
  if (!expiresAt) return true;

  return new Date(expiresAt).getTime() > Date.now();
}

export default function InformationPage() {
  const supabase = createClient();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserId(user?.id ?? null);

      const { data, error: fetchError } = await supabase
        .from("community_posts")
        .select(
          `
            id,
            user_id,
            type,
            title,
            description,
            image_url,
            contact_url,
            location,
            expires_at,
            status,
            created_at,
            updated_at,
            whatsapp_number,
            external_url
          `
        )
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const activePosts = ((data ?? []) as CommunityPost[]).filter(
        (post) => isNotExpired(post.expires_at)
      );

      setPosts(activePosts);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat informasi. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  async function handleDelete(post: CommunityPost) {
    if (!userId || userId !== post.user_id) {
      alert("Kamu tidak memiliki izin untuk menghapus informasi ini.");
      return;
    }

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus "${post.title}"?`
    );

    if (!confirmed) return;

    setDeletingId(post.id);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== post.user_id) {
        alert("Kamu tidak memiliki izin untuk menghapus informasi ini.");
        return;
      }

      const { data, error: deleteError } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", post.id)
        .eq("user_id", user.id)
        .select("id");

      if (deleteError) throw deleteError;

      if (!data || data.length === 0) {
        throw new Error(
          "Informasi tidak terhapus. Periksa izin akses Supabase."
        );
      }

      setPosts((currentPosts) =>
        currentPosts.filter((item) => item.id !== post.id)
      );
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus informasi.");
    } finally {
      setDeletingId(null);
    }
  }

  const types = Array.from(
    new Set(posts.map((post) => post.type).filter(Boolean))
  );

  const filteredPosts =
    selectedType === "all"
      ? posts
      : posts.filter((post) => post.type === selectedType);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Informasi Lagoa Youth
          </h1>

          <p className="mt-2 text-gray-600">
            Temukan kegiatan, pengumuman, dan informasi komunitas.
          </p>
        </div>

        <Link
          href="/information/create"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Buat Informasi
        </Link>
      </div>

      {types.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              selectedType === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Semua
          </button>

          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                selectedType === type
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {formatType(type)}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="py-16 text-center text-gray-500">
          Memuat informasi...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p>{error}</p>

          <button
            type="button"
            onClick={loadPosts}
            className="mt-3 text-sm font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Belum ada informasi
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Informasi yang tersedia akan ditampilkan di halaman ini.
          </p>
        </div>
      )}

      {!loading && !error && filteredPosts.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => {
            const isOwner = Boolean(
              userId && userId === post.user_id
            );

            return (
              <article
                key={post.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <Link
                  href={`/information/${post.id}`}
                  className="group block"
                >
                  {post.image_url ? (
                    <div className="h-52 overflow-hidden bg-gray-100">
                      <img
                        src={post.image_url}
                        alt={`Poster ${post.title}`}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-gray-100 text-gray-400">
                      Tidak ada poster
                    </div>
                  )}

                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {formatType(post.type)}
                      </span>

                      {post.expires_at && (
                        <span className="text-xs text-gray-500">
                          Berlaku sampai {formatDate(post.expires_at)}
                        </span>
                      )}
                    </div>

                    <h2 className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                      {post.title}
                    </h2>

                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {post.description}
                    </p>

                    {post.location && (
                      <p className="mt-3 line-clamp-1 text-sm text-gray-500">
                        📍 {post.location}
                      </p>
                    )}

                    <p className="mt-4 text-sm font-semibold text-blue-600">
                      Lihat detail →
                    </p>
                  </div>
                </Link>

                {isOwner && (
                  <div className="mt-auto flex items-center gap-3 border-t border-gray-100 px-5 py-3">
                    <Link
                      href={`/information/${post.id}/edit`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(post)}
                      disabled={deletingId === post.id}
                      className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === post.id
                        ? "Menghapus..."
                        : "Hapus"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
