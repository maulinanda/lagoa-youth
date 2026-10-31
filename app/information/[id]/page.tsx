
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

function formatDate(value: string | null) {
  if (!value) return "Tidak ditentukan";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatType(value: string) {
  const labels: Record<string, string> = {
    event: "Acara",
    activity: "Aktivitas",
    announcement: "Pengumuman",
    promotion: "Promosi",
    information: "Informasi",
  };

  return labels[value.toLowerCase()] ?? value;
}

export default function InformationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params.id;

  const supabase = createClient();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const isOwner = Boolean(
    userId && post && userId === post.user_id
  );

  const loadPost = useCallback(async () => {
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
        .eq("id", postId)
        .eq("status", "published")
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setPost(null);
        setError(
          "Informasi tidak ditemukan atau sudah tidak tersedia."
        );
        return;
      }

      setPost(data as CommunityPost);
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat mengambil informasi.");
    } finally {
      setLoading(false);
    }
  }, [postId, supabase]);

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId, loadPost]);

  async function handleDelete() {
    if (!post || !isOwner) {
      alert("Kamu tidak memiliki izin untuk menghapus informasi ini.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus informasi "${post.title}"? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    setDeleting(true);

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

      alert("Informasi berhasil dihapus.");
      router.replace("/information");
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus informasi.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-center text-gray-500">
          Memuat informasi...
        </p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="mb-4 text-center text-gray-600">
          {error || "Informasi tidak ditemukan."}
        </p>

        <div className="text-center">
          <Link
            href="/information"
            className="text-blue-600 hover:underline"
          >
            Kembali ke Informasi
          </Link>
        </div>
      </main>
    );
  }

  const whatsappLink = post.whatsapp_number
    ? `https://wa.me/${post.whatsapp_number.replace(/\D/g, "")}`
    : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/information"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Kembali ke Informasi
        </Link>

        {isOwner && (
          <div className="flex gap-2">
            <Link
              href={`/information/${post.id}/edit`}
              className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              Edit
            </Link>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        )}
      </div>

      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {post.image_url && (
          <div className="w-full bg-gray-100">
            <img
              src={post.image_url}
              alt={`Poster ${post.title}`}
              className="max-h-[650px] w-full object-contain"
            />
          </div>
        )}

        <div className="p-5 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {formatType(post.type)}
            </span>

            {post.expires_at && (
              <span className="text-sm text-gray-500">
                Berlaku sampai {formatDate(post.expires_at)}
              </span>
            )}
          </div>

          <h1 className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl">
            {post.title}
          </h1>

          <div className="whitespace-pre-wrap break-words text-base leading-7 text-gray-700">
            {post.description}
          </div>

          {(post.location ||
            post.whatsapp_number ||
            post.external_url ||
            post.contact_url) && (
            <section className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Informasi Kontak
              </h2>

              <div className="space-y-3 text-sm text-gray-700">
                {post.location && (
                  <p>
                    <span className="font-medium">Lokasi: </span>
                    {post.location}
                  </p>
                )}

                {post.whatsapp_number && (
                  <p>
                    <span className="font-medium">WhatsApp: </span>
                    {post.whatsapp_number}
                  </p>
                )}

                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
                  >
                    Hubungi melalui WhatsApp
                  </a>
                )}

                {post.external_url && (
                  <p>
                    <a
                      href={post.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Buka tautan informasi
                    </a>
                  </p>
                )}

                {post.contact_url && (
                  <p>
                    <a
                      href={post.contact_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Buka tautan kontak
                    </a>
                  </p>
                )}
              </div>
            </section>
          )}

          <p className="mt-8 border-t border-gray-200 pt-4 text-xs text-gray-400">
            Dipublikasikan pada {formatDate(post.created_at)}
          </p>
        </div>
      </article>
    </main>
  );
}
