
"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

type CommunityPost = {
  id: string;
  user_id: string;
  type: "announcement" | "job";
  title: string;
  description: string;
  image_url: string | null;
  whatsapp_number: string | null;
  external_url: string | null;
  contact_url: string | null;
  location: string | null;
  expires_at: string | null;
  status: string;
};

function buildWhatsAppNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (!digits) return null;

  let number = digits;

  if (number.startsWith("0")) {
    number = "62" + number.slice(1);
  } else if (number.startsWith("8")) {
    number = "62" + number;
  }

  if (number.length < 8 || number.length > 15) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }

  return number;
}

function normalizeExternalUrl(
  input: string,
): string | null {
  const value = input.trim();

  if (!value) return null;

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Link eksternal harus berupa URL lengkap, misalnya https://contoh.com.",
    );
  }

  if (
    url.protocol !== "https:" &&
    url.protocol !== "http:"
  ) {
    throw new Error(
      "Link eksternal hanya boleh menggunakan HTTP atau HTTPS.",
    );
  }

  if (!url.hostname || !url.hostname.includes(".")) {
    throw new Error("Alamat link eksternal tidak valid.");
  }

  return url.toString();
}

// Mengubah waktu ISO dari database menjadi tanggal dan jam lokal.
function toLocalDateTime(value: string | null): {
  date: string;
  time: string;
} {
  if (!value) {
    return { date: "", time: "" };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: "", time: "" };
  }

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return {
    date: `${date.getFullYear()}-${pad(
      date.getMonth() + 1,
    )}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(
      date.getMinutes(),
    )}`,
  };
}

export default function EditInformationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id;

  const [type, setType] = useState<
    "announcement" | "job"
  >("announcement");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  const [expiresDate, setExpiresDate] = useState("");
  const [expiresTime, setExpiresTime] = useState("");

  const [currentImageUrl, setCurrentImageUrl] = useState<
    string | null
  >(null);

  const [poster, setPoster] = useState<File | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPost() {
      setCheckingAuth(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data, error: queryError } = await supabase
          .from("community_posts")
          .select(
            "id, user_id, type, title, description, image_url, whatsapp_number, external_url, contact_url, location, expires_at, status",
          )
          .eq("id", postId)
          .maybeSingle();

        if (!active) return;

        if (queryError) {
          throw new Error(
            `Gagal memuat informasi: ${queryError.message}`,
          );
        }

        if (!data) {
          throw new Error(
            "Informasi tidak ditemukan atau tidak dapat diakses.",
          );
        }

        const post = data as CommunityPost;

        if (post.user_id !== user.id) {
          throw new Error(
            "Kamu tidak memiliki izin untuk mengedit informasi ini.",
          );
        }

        setType(
          post.type === "job" ? "job" : "announcement",
        );
        setTitle(post.title);
        setDescription(post.description);
        setLocation(post.location ?? "");
        setWhatsappNumber(post.whatsapp_number ?? "");
        setExternalUrl(post.external_url ?? "");
        setCurrentImageUrl(post.image_url);

        const expiration = toLocalDateTime(
          post.expires_at,
        );

        setExpiresDate(expiration.date);
        setExpiresTime(expiration.time);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat informasi.",
        );
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    }

    if (postId) {
      loadPost();
    }

    return () => {
      active = false;
    };
  }, [postId, router]);

  function handlePosterChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setError("");
    setPoster(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        "Poster harus berformat JPG, PNG, atau WebP.",
      );
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Ukuran poster maksimal 5 MB.");
      event.target.value = "";
      return;
    }

    setPoster(file);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (saving) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanLocation = location.trim();

    if (
      cleanTitle.length < 3 ||
      cleanTitle.length > 150
    ) {
      setError("Judul harus terdiri dari 3–150 karakter.");
      return;
    }

    if (
      cleanDescription.length < 1 ||
      cleanDescription.length > 5000
    ) {
      setError(
        "Deskripsi wajib diisi dan maksimal 5.000 karakter.",
      );
      return;
    }

    if (cleanLocation.length > 200) {
      setError("Lokasi maksimal 200 karakter.");
      return;
    }

    let normalizedWhatsApp: string | null;
    let normalizedExternalUrl: string | null;

    try {
      normalizedWhatsApp =
        buildWhatsAppNumber(whatsappNumber);

      normalizedExternalUrl =
        normalizeExternalUrl(externalUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Kontak tidak valid.",
      );
      return;
    }

    let expiration: string | null = null;

    if (expiresDate || expiresTime) {
      if (!expiresDate || !expiresTime) {
        setError(
          "Mohon lengkapi tanggal dan jam kedaluwarsa.",
        );
        return;
      }

      const expirationDate = new Date(
        `${expiresDate}T${expiresTime}:00`,
      );

      if (
        Number.isNaN(expirationDate.getTime()) ||
        expirationDate.getTime() <= Date.now()
      ) {
        setError(
          "Tanggal dan jam kedaluwarsa harus berada di masa depan.",
        );
        return;
      }

      expiration = expirationDate.toISOString();
    }

    setSaving(true);

    let uploadedFilePath: string | null = null;

    try {
      // Pastikan pengguna masih login.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      // Ambil kembali pemilik data sebelum update.
      const { data: existingPost, error: ownerError } =
        await supabase
          .from("community_posts")
          .select("id, user_id")
          .eq("id", postId)
          .maybeSingle();

      if (ownerError) {
        throw new Error(
          `Gagal memeriksa pemilik informasi: ${ownerError.message}`,
        );
      }

      if (!existingPost) {
        throw new Error(
          "Informasi tidak ditemukan.",
        );
      }

      if (existingPost.user_id !== user.id) {
        throw new Error(
          "Kamu tidak memiliki izin untuk mengedit informasi ini.",
        );
      }

      let imageUrl = currentImageUrl;

      // Upload poster baru jika pengguna memilih file.
      if (poster) {
        const extensionByType: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };

        const extension = extensionByType[poster.type];

        if (!extension) {
          throw new Error(
            "Format poster tidak didukung.",
          );
        }

        const filePath =
          `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("community-posters")
            .upload(filePath, poster, {
              contentType: poster.type,
              upsert: false,
            });

        if (uploadError) {
          throw new Error(
            `Gagal mengunggah poster: ${uploadError.message}`,
          );
        }

        uploadedFilePath = filePath;

        const { data: publicUrlData } =
          supabase.storage
            .from("community-posters")
            .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const { data: updatedRows, error: updateError } =
        await supabase
          .from("community_posts")
          .update({
            type,
            title: cleanTitle,
            description: cleanDescription,
            image_url: imageUrl,
            whatsapp_number: normalizedWhatsApp,
            external_url: normalizedExternalUrl,
            contact_url: null,
            location: cleanLocation || null,
            expires_at: expiration,
            updated_at: new Date().toISOString(),
          })
          .eq("id", postId)
          .eq("user_id", user.id)
          .select("id");

      if (updateError) {
        throw new Error(
          `Gagal memperbarui informasi: ${updateError.message}`,
        );
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error(
          "Informasi tidak berhasil diperbarui. Periksa izin RLS.",
        );
      }

      router.push("/information");
      router.refresh();
    } catch (err) {
      console.error(err);

      // Jika poster baru sudah terunggah tetapi update gagal,
      // hapus poster baru tersebut agar tidak tertinggal.
      if (uploadedFilePath) {
        const { error: cleanupError } =
          await supabase.storage
            .from("community-posters")
            .remove([uploadedFilePath]);

        if (cleanupError) {
          console.error(
            "Gagal membersihkan poster yang tidak terpakai:",
            cleanupError,
          );
        }
      }

      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        Memeriksa sesi login dan memuat informasi...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Link
        href="/information"
        className="mb-6 inline-block text-sm text-gray-500 hover:text-gray-900"
      >
        ← Kembali ke Papan Informasi
      </Link>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Edit Informasi
      </h1>

      <p className="mt-2 text-sm text-gray-500">
        Perbarui informasi yang sudah kamu publikasikan.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6"
      >
        {/* Jenis informasi */}
        <div>
          <label
            htmlFor="type"
            className="mb-2 block text-sm font-medium"
          >
            Jenis informasi *
          </label>

          <select
            id="type"
            value={type}
            onChange={(event) =>
              setType(
                event.target.value as
                  | "announcement"
                  | "job",
              )
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
          >
            <option value="announcement">
              Poster / Pengumuman
            </option>
            <option value="job">
              Lowongan Kerja
            </option>
          </select>
        </div>

        {/* Judul */}
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium"
          >
            Judul *
          </label>

          <input
            id="title"
            required
            minLength={3}
            maxLength={150}
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />
        </div>

        {/* Deskripsi */}
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium"
          >
            Deskripsi / Detail Informasi *
          </label>

          <textarea
            id="description"
            required
            maxLength={5000}
            rows={6}
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />

          <p className="mt-1 text-right text-xs text-gray-500">
            {description.length}/5000 karakter
          </p>
        </div>

        {/* Poster */}
        <div>
          <label
            htmlFor="poster"
            className="mb-2 block text-sm font-medium"
          >
            Poster / Banner
          </label>

          {currentImageUrl && (
            <div className="mb-3">
              <p className="mb-2 text-xs text-gray-500">
                Poster saat ini
              </p>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImageUrl}
                alt="Poster informasi saat ini"
                className="max-h-64 rounded-xl border border-gray-200 object-contain"
              />
            </div>
          )}

          <input
            id="poster"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePosterChange}
            className="w-full rounded-xl border border-gray-300 p-3 text-sm"
          />

          <p className="mt-2 text-xs text-gray-500">
            JPG, PNG, atau WebP. Maksimal 5 MB.
            Kosongkan jika ingin mempertahankan poster lama.
          </p>

          {poster && (
            <p className="mt-2 text-sm text-green-700">
              Poster baru dipilih: {poster.name}
            </p>
          )}
        </div>

        {/* Lokasi */}
        <div>
          <label
            htmlFor="location"
            className="mb-2 block text-sm font-medium"
          >
            Lokasi (opsional)
          </label>

          <input
            id="location"
            maxLength={200}
            value={location}
            onChange={(event) =>
              setLocation(event.target.value)
            }
            placeholder="Contoh: Lagoa, Jakarta Utara"
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
          />
        </div>

        {/* Kontak dan tautan */}
        <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
          <div>
            <h2 className="font-semibold">
              Kontak dan Tautan
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Keduanya opsional.
            </p>
          </div>

          <div>
            <label
              htmlFor="whatsappNumber"
              className="mb-2 block text-sm font-medium"
            >
              Nomor WhatsApp
            </label>

            <input
              id="whatsappNumber"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={whatsappNumber}
              onChange={(event) =>
                setWhatsappNumber(event.target.value)
              }
              placeholder="081234567890"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            <p className="mt-1 text-xs text-gray-500">
              Masukkan nomor saja. Contoh 081234567890.
            </p>
          </div>

          <div>
            <label
              htmlFor="externalUrl"
              className="mb-2 block text-sm font-medium"
            >
              Link Eksternal
            </label>

            <input
              id="externalUrl"
              type="url"
              value={externalUrl}
              onChange={(event) =>
                setExternalUrl(event.target.value)
              }
              placeholder="https://contoh.com/formulir"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>
        </div>

        {/* Kedaluwarsa */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Berlaku sampai (opsional)
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="expiresDate"
                className="mb-1 block text-xs text-gray-500"
              >
                Tanggal kedaluwarsa
              </label>

              <input
                id="expiresDate"
                type="date"
                value={expiresDate}
                onChange={(event) =>
                  setExpiresDate(event.target.value)
                }
                className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3"
              />
            </div>

            <div>
              <label
                htmlFor="expiresTime"
                className="mb-1 block text-xs text-gray-500"
              >
                Jam kedaluwarsa
              </label>

              <input
                id="expiresTime"
                type="time"
                value={expiresTime}
                onChange={(event) =>
                  setExpiresTime(event.target.value)
                }
                className="w-full min-w-0 rounded-xl border border-gray-300 px-3 py-3"
              />
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Kosongkan keduanya jika informasi tidak memiliki
            tanggal kedaluwarsa.
          </p>
        </div>

        {/* Pengingat */}
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Pastikan informasi benar dan kamu memiliki izin
          untuk membagikan poster tersebut.
        </div>

        {/* Tombol simpan */}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Menyimpan perubahan..."
            : "Simpan Perubahan"}
        </button>
      </form>
    </main>
  );
}
