
"use client";

import {
  FormEvent,
  ChangeEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function buildWhatsAppNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (!digits) return null;

  let number = digits;

  if (number.startsWith("0")) {
    number = "62" + number.slice(1);
  } else if (number.startsWith("8")) {
    number = "62" + number;
  }

  // Format internasional: 8–15 digit.
  if (number.length < 8 || number.length > 15) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }

  return number;
}

function normalizeExternalUrl(input: string): string | null {
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

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      "Link eksternal hanya boleh menggunakan HTTP atau HTTPS.",
    );
  }

  if (!url.hostname || !url.hostname.includes(".")) {
    throw new Error("Alamat link eksternal tidak valid.");
  }

  return url.toString();
}

export default function CreateInformationPage() {
  const router = useRouter();

  const [type, setType] = useState<
    "announcement" | "job"
  >("announcement");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  // Tanggal dan jam kedaluwarsa dipisahkan
  const [expiresDate, setExpiresDate] = useState("");
  const [expiresTime, setExpiresTime] = useState("");

  const [poster, setPoster] = useState<File | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  function handlePosterChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    setError("");
    setPoster(null);

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Poster harus berformat JPG, PNG, atau WebP.");
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

    if (loading) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanLocation = location.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 150) {
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

    // Validasi tanggal dan jam kedaluwarsa
    let expiration: string | null = null;

    // Kedua input opsional.
    // Jika salah satunya diisi, keduanya wajib dilengkapi.
    if (expiresDate || expiresTime) {
      if (!expiresDate || !expiresTime) {
        setError(
          "Mohon lengkapi tanggal dan jam kedaluwarsa.",
        );
        return;
      }

      // Gabungkan tanggal dan jam sebagai waktu lokal
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

      // Simpan sebagai ISO UTC ke Supabase
      expiration = expirationDate.toISOString();
    }

    setLoading(true);

    let uploadedFilePath: string | null = null;

    try {
      // Periksa sesi login sebelum melakukan operasi
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      let imageUrl: string | null = null;

      // Upload poster jika pengguna memilih file
      if (poster) {
        const extensionByType: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };

        const extension = extensionByType[poster.type];

        if (!extension) {
          throw new Error("Format poster tidak didukung.");
        }

        const filePath =
          `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
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

        const { data: publicUrlData } = supabase.storage
          .from("community-posters")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      // Simpan postingan ke database
      const { error: insertError } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          type,
          title: cleanTitle,
          description: cleanDescription,
          image_url: imageUrl,
          whatsapp_number: normalizedWhatsApp,
          external_url: normalizedExternalUrl,

          // Pertahankan contact_url untuk kompatibilitas data lama
          contact_url: null,

          location: cleanLocation || null,
          expires_at: expiration,
          status: "published",
        });

      if (insertError) {
        throw new Error(
          `Gagal menyimpan informasi: ${insertError.message}`,
        );
      }

      router.push("/information");
      router.refresh();
    } catch (err) {
      console.error(err);

      // Jika upload berhasil tetapi insert gagal,
      // hapus file agar tidak meninggalkan file tidak terpakai.
      if (uploadedFilePath) {
        const { error: cleanupError } = await supabase.storage
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
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        Memeriksa sesi login...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <button
        type="button"
        onClick={() => router.push("/information")}
        className="mb-6 text-sm text-gray-500 hover:text-gray-900"
      >
        ← Kembali ke Papan Informasi
      </button>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Bagikan Informasi
      </h1>

      <p className="mt-2 text-sm text-gray-500">
        Bagikan pengumuman komunitas atau peluang kerja
        kepada warga Lagoa.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
            <option value="job">Lowongan Kerja</option>
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
            placeholder={
              type === "job"
                ? "Contoh: Lowongan Admin Gudang"
                : "Contoh: Pengumuman Kerja Bakti Lagoa"
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
            placeholder="Tuliskan detail informasi di sini..."
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
            Poster / Banner (opsional)
          </label>

          <input
            id="poster"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePosterChange}
            className="w-full rounded-xl border border-gray-300 p-3 text-sm"
          />

          <p className="mt-2 text-xs text-gray-500">
            JPG, PNG, atau WebP. Maksimal 5 MB.
          </p>

          {poster && (
            <p className="mt-2 text-sm text-green-700">
              File dipilih: {poster.name}
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
              Keduanya opsional. Kamu bisa mengisi salah satu
              atau keduanya.
            </p>
          </div>

          <div>
            <label
              htmlFor="whatsappNumber"
              className="mb-2 block text-sm font-medium"
            >
              Nomor WhatsApp (opsional)
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
              Tautan WhatsApp akan dibuat otomatis.
            </p>
          </div>

          <div>
            <label
              htmlFor="externalUrl"
              className="mb-2 block text-sm font-medium"
            >
              Link Eksternal (opsional)
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

            <p className="mt-1 text-xs text-gray-500">
              Contoh: formulir lamaran, situs perusahaan,
              atau halaman pendaftaran.
            </p>
          </div>
        </div>

        {/* Kedaluwarsa: tanggal dan jam terpisah */}
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

        {/* Pesan error */}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {/* Pengingat */}
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Informasi akan langsung dipublikasikan. Pastikan
          isinya benar dan kamu memiliki izin untuk membagikan
          poster tersebut. Jangan unggah data pribadi sensitif.
        </div>

        {/* Tombol publikasi */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Mempublikasikan..."
            : "Publikasikan Informasi"}
        </button>
      </form>
    </main>
  );
}
