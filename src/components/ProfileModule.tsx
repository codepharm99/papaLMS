"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";

type ProfileLinks = { github?: string; linkedin?: string; website?: string; other?: string };
type ProfileCertificate = { title: string; url: string };
type ProfileSettings = { links?: ProfileLinks; certificates?: ProfileCertificate[] };

type ProfileShape = {
  id?: number | string;
  userId?: string;
  fullName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  settings?: ProfileSettings | null;
  email?: string | null;
};

type FormState = {
  fullName: string;
  bio: string;
  certificates: Array<{ title: string; url?: string; file?: File | null }>;
  links: { github: string; linkedin: string; website: string; other: string };
};

const emptyForm: FormState = {
  fullName: "",
  bio: "",
  certificates: [],
  links: { github: "", linkedin: "", website: "", other: "" },
};

export default function ProfileModule() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileShape | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { user, refresh } = useCurrentUser();
  const [editMode, setEditMode] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
  const inputRef = useRef<HTMLInputElement | null>(null);
  const certificateInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; type?: "info" | "success" | "error"; message: string; visible: boolean }>>([]);

  const showToast = (message: string, type: "info" | "success" | "error" = "info", timeout = 4000) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
    // start hidden so we can animate entrance
    setToasts((s) => [...s, { id, type, message, visible: false }]);
    // next tick -> mark visible to trigger CSS transition
    setTimeout(() => {
      setToasts((s) => s.map((t) => (t.id === id ? { ...t, visible: true } : t)));
    }, 20);
    // start hide animation shortly before removing
    const hideAfter = Math.max(300, timeout - 300);
    setTimeout(() => {
      setToasts((s) => s.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    }, hideAfter);
    // remove after full timeout
    setTimeout(() => {
      setToasts((s) => s.filter((t) => t.id !== id));
    }, timeout);
  };

  useEffect(() => {
    let mounted = true;
    // First check current auth state via /api/auth/me (some auth systems
    // may differ in which routes accept cookies). If authenticated, then
    // request /api/profile for the actual profile data.
    (async () => {
      try {
        // Prefer client-side user context to determine auth state.
        if (!user) {
          setUnauthenticated(true);
          setLoading(false);
          return;
        }

        // we are authenticated on client — fetch profile
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          // treat as unauthenticated
          setUnauthenticated(true);
          setLoading(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (data?.profile) {
          const normalized = normalizeSettings(data.profile.settings);
          setProfile(data.profile);
          setForm({
            fullName: data.profile.fullName ?? "",
            bio: data.profile.bio ?? "",
            links: {
              github: normalized.links.github ?? "",
              linkedin: normalized.links.linkedin ?? "",
              website: normalized.links.website ?? "",
              other: normalized.links.other ?? "",
            },
            certificates: normalized.certificates.map((c) => ({ title: c.title, url: c.url })),
          });
          setAvatarPreview(data.profile.avatarUrl ?? null);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        if (mounted) setUnauthenticated(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const settingsPayload = buildSettingsPayload(form);
      const hasCertificateFiles = form.certificates.some((c) => c.file);
      let res: Response;
      if (avatarFile || hasCertificateFiles) {
        const fd = new FormData();
        fd.append("fullName", form.fullName);
        fd.append("bio", form.bio);
        fd.append("settingsMeta", JSON.stringify(settingsPayload.meta));
        // create a File from the compressed blob so server can read name/type
        if (avatarFile) {
          const compressed = await compressImage(avatarFile, 512, 0.8);
          const uploadName = avatarFile.name.replace(/\.[^.]+$/, "") + ".jpg";
          const fileForUpload = new File([compressed], uploadName, { type: compressed.type });
          fd.append("avatar", fileForUpload);
        }
        settingsPayload.newCertificateFiles.forEach((file) => fd.append("certificateFiles", file));
        res = await fetch("/api/profile", { method: "PATCH", body: fd });
      } else {
        const bodyPayload: any = { fullName: form.fullName, bio: form.bio, settings: settingsPayload.settingsOnly };
        if (avatarPreview) bodyPayload.avatarUrl = avatarPreview;
        res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Save failed");
      }
      const data = await res.json();
      setProfile(data.profile);
      const normalized = normalizeSettings(data.profile.settings);
      setForm({
        fullName: data.profile.fullName ?? "",
        bio: data.profile.bio ?? "",
        links: {
          github: normalized.links.github ?? "",
          linkedin: normalized.links.linkedin ?? "",
          website: normalized.links.website ?? "",
          other: normalized.links.other ?? "",
        },
        certificates: normalized.certificates.map((c) => ({ title: c.title, url: c.url })),
      });
      setEditMode(false);
      showToast("Профиль сохранён", "success");
    } catch (err: any) {
      console.error("Save error:", err);
      showToast(err?.message ?? "Ошибка при сохранении профиля", "error");
    } finally {
      setSaving(false);
    }
  };

  const normalizeSettings = (settings: ProfileSettings | null | undefined): Required<ProfileSettings> => {
    const linksRaw = (settings as any)?.links ?? {};
    const links: ProfileLinks = {
      github: typeof linksRaw.github === "string" ? linksRaw.github : undefined,
      linkedin: typeof linksRaw.linkedin === "string" ? linksRaw.linkedin : undefined,
      website: typeof linksRaw.website === "string" ? linksRaw.website : undefined,
      other: typeof linksRaw.other === "string" ? linksRaw.other : undefined,
    };
    const certificatesRaw = Array.isArray((settings as any)?.certificates) ? (settings as any).certificates : [];
    const certificates = certificatesRaw
      .map((c) => (c && typeof c.title === "string" && typeof c.url === "string" ? { title: c.title, url: c.url } : null))
      .filter((c): c is ProfileCertificate => !!c);
    return { links, certificates };
  };

  const buildSettingsPayload = (state: FormState) => {
    const trimmedLinks = Object.fromEntries(
      Object.entries(state.links)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v)
    ) as ProfileLinks;

    const existingCertificates = state.certificates
      .filter((c) => c.url && !c.file)
      .map((c) => ({ title: (c.title || "").trim() || c.url!, url: c.url! }));

    const newCerts = state.certificates.filter((c) => c.file).map((c) => ({
      title: (c.title || "").trim() || (c.file ? c.file.name.replace(/\\.pdf$/i, "") : "Сертификат"),
      file: c.file as File,
    }));

    return {
      meta: {
        links: trimmedLinks,
        existingCertificates,
        newCertificates: newCerts.map((c) => ({ title: c.title })),
      },
      newCertificateFiles: newCerts.map((c) => c.file),
      settingsOnly: { links: trimmedLinks, certificates: existingCertificates },
    };
  };

  // Compress and resize image using a canvas; returns a JPEG Blob
  const compressImage = (file: File, maxSize = 512, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.onload = () => {
          // calculate target size keeping aspect ratio
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not supported'));
          // draw with white background to avoid transparent PNGs saving as black when converting to JPEG
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Compression failed'));
              // convert to jpeg if not already
              if (blob.type === 'image/jpeg') return resolve(blob);
              // ensure jpeg
              canvas.toBlob((jpegBlob) => {
                if (!jpegBlob) return reject(new Error('JPEG conversion failed'));
                resolve(jpegBlob);
              }, 'image/jpeg', quality);
            },
            'image/jpeg',
            quality
          );
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  };

  const initials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const humanFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleFile = (f: File) => {
    const allowed = ["image/png", "image/jpeg"];
    if (!allowed.includes(f.type)) {
      showToast("Разрешены только PNG и JPG (jpeg). SVG и другие форматы отклоняются.", "error");
      return;
    }
    if (f.size > MAX_AVATAR_BYTES) {
      showToast(`Файл слишком большой — максимум ${humanFileSize(MAX_AVATAR_BYTES)}`, "error");
      return;
    }
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result));
    reader.readAsDataURL(f);
  };

  const addCertificateFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const nonPdf = files.filter((f) => f.type !== "application/pdf");
    if (nonPdf.length > 0) {
      showToast("Сертификаты принимаются только в формате PDF.", "error");
      return;
    }
    setForm((prev) => ({
      ...prev,
      certificates: [
        ...prev.certificates,
        ...files.map((f) => ({
          title: f.name.replace(/\\.pdf$/i, ""),
          file: f,
        })),
      ],
    }));
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (unauthenticated)
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Мой профиль</h1>
        <p className="mb-4">Вы не авторизованы. Пожалуйста, войдите, чтобы посмотреть или редактировать профиль.</p>
        <div className="flex gap-2">
          <button onClick={() => router.push('/login')} className="px-4 py-2 rounded bg-blue-600 text-white">
            Войти
          </button>
        </div>
      </div>
    );

  const normalizedSettings = normalizeSettings(profile?.settings);

  return (
    <div className="max-w-4xl mx-auto p-6 relative">
      {/* Toast container */}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-sm w-full rounded shadow-md px-4 py-2 text-sm transform transition-all duration-300 ease-out ${
              t.visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
            } ${t.type === "success" ? "bg-green-600 text-white" : t.type === "error" ? "bg-red-600 text-white" : "bg-gray-800 text-white"}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex-none">
                {t.type === 'success' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : t.type === 'error' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                )}
              </span>
              <div className="flex-1">{t.message}</div>
            </div>
          </div>
        ))}
      </div>
      <header className="rounded-lg overflow-hidden mb-6 shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <h1 className="text-2xl font-semibold">Мой профиль</h1>
          <p className="text-sm opacity-90 mt-1">Редактируйте свои данные и добавьте фото профиля</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="col-span-1 bg-white border rounded-lg p-6 shadow transition-transform hover:-translate-y-0.5">
          <div className="flex flex-col items-center">
            {profile?.avatarUrl ? (
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 ring-4 ring-white shadow-md">
                <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-2xl font-semibold text-gray-700 mb-4">
                {initials(profile?.fullName ?? user?.name ?? '')}
              </div>
            )}

            <div className="text-center">
              <div className="text-lg font-medium">{profile?.fullName ?? user?.name ?? 'Без имени'}</div>
              <div className="text-sm text-gray-500 mt-1">{user?.role ?? '—'}</div>
              <div className="mt-3 text-sm text-gray-600">{profile?.email ?? '—'}</div>
            </div>

            <div className="mt-6 w-full">
              <button
                onClick={() => setEditMode(!editMode)}
                className="w-full px-4 py-2 rounded-md bg-white text-indigo-700 border hover:bg-indigo-50 transition"
              >
                {editMode ? 'Отмена' : 'Редактировать профиль'}
              </button>
            </div>
          </div>
        </div>

        {/* Edit / Details Panel */}
        <div className="col-span-1 md:col-span-2 bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Данные профиля</h2>

          {!editMode && (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Полное имя</div>
                <div className="mt-1 text-base">{profile?.fullName ?? '—'}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">О себе</div>
                <div className="mt-1 text-base whitespace-pre-wrap">{profile?.bio ?? '—'}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Сертификаты (PDF)</div>
                <div className="mt-2 space-y-2">
                  {normalizedSettings.certificates.length > 0 ? (
                    normalizedSettings.certificates.map((c, idx) => (
                      <a
                        key={idx}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                      >
                        <span className="truncate">{c.title}</span>
                        <span className="ml-3 text-xs text-gray-500">PDF</span>
                      </a>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">Сертификаты пока не добавлены.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Полезные ссылки</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(normalizedSettings.links).filter(([, v]) => v).length > 0 ? (
                    Object.entries(normalizedSettings.links)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <a
                          key={k}
                          href={v}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                        >
                          <span className="capitalize">{k}</span>
                          <span className="truncate pl-2 text-gray-600">{v}</span>
                        </a>
                      ))
                  ) : (
                    <div className="text-sm text-gray-500">Нет добавленных ссылок.</div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button onClick={() => setEditMode(true)} className="px-4 py-2 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition">
                  Редактировать
                </button>
              </div>
            </div>
          )}

          {editMode && (
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Аватар</label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => inputRef.current?.click()}
                      onKeyDown={() => inputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        const f = e.dataTransfer?.files?.[0] ?? null;
                        if (f) handleFile(f);
                      }}
                      className={`relative w-24 h-24 rounded-full overflow-hidden flex items-center justify-center cursor-pointer transition-shadow ${
                        dragActive ? "ring-4 ring-indigo-300 shadow-lg" : "ring-0"
                      }`}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                          {initials(form.fullName || user?.name)}
                        </div>
                      )}

                      {/* overlay buttons */}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/25 flex items-end justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="mb-2 flex gap-2">
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              inputRef.current?.click();
                            }}
                            className="px-2 py-1 bg-white/90 text-sm rounded text-gray-800"
                          >
                            Изменить
                          </button>
                          {avatarPreview && (
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setAvatarFile(null);
                                setAvatarPreview(null);
                              }}
                              className="px-2 py-1 bg-white/90 text-sm rounded text-red-600"
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      ref={inputRef}
                      id="avatar-input"
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (!f) return;
                        handleFile(f);
                        // reset input so same file can be selected again if needed
                        e.currentTarget.value = "";
                      }}
                    />

                    <div className="flex-1">
                      {avatarPreview && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="text-sm text-gray-500">{avatarFile ? `${avatarFile.name} • ${humanFileSize(avatarFile.size)}` : null}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Полное имя</label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="mt-1 block w-full border rounded p-2"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">О себе</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full border rounded p-2"
                  placeholder="Короткая биография"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Сертификаты (PDF)</label>
                  <button
                    type="button"
                    onClick={() => certificateInputRef.current?.click()}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    Загрузить файл
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Прикрепите PDF-файлы сертификатов. Их можно переименовать ниже.</p>
                <input
                  ref={certificateInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addCertificateFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                <div className="mt-3 space-y-2">
                  {form.certificates.length === 0 && (
                    <div className="text-sm text-gray-500">Пока нет прикреплённых сертификатов.</div>
                  )}
                  {form.certificates.map((c, idx) => (
                    <div key={idx} className="flex flex-col rounded border px-3 py-2 gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={c.title}
                          onChange={(e) => {
                            const next = [...form.certificates];
                            next[idx] = { ...next[idx], title: e.target.value };
                            setForm({ ...form, certificates: next });
                          }}
                          className="flex-1 rounded border px-3 py-2 text-sm"
                          placeholder="Название сертификата"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, certificates: form.certificates.filter((_, i) => i !== idx) })}
                          className="rounded border px-2 text-sm text-gray-600 hover:bg-gray-50"
                          aria-label="Удалить сертификат"
                        >
                          ×
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                            Открыть PDF
                          </a>
                        ) : (
                          <span className="italic text-gray-500">{c.file ? c.file.name : "Новый файл"}</span>
                        )}
                        {c.file && <span className="text-gray-500">Будет загружен</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">GitHub</label>
                  <input
                    value={form.links.github}
                    onChange={(e) => setForm({ ...form, links: { ...form.links, github: e.target.value } })}
                    className="mt-1 block w-full border rounded p-2"
                    placeholder="https://github.com/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                  <input
                    value={form.links.linkedin}
                    onChange={(e) => setForm({ ...form, links: { ...form.links, linkedin: e.target.value } })}
                    className="mt-1 block w-full border rounded p-2"
                    placeholder="https://www.linkedin.com/in/username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Портфолио / сайт</label>
                  <input
                    value={form.links.website}
                    onChange={(e) => setForm({ ...form, links: { ...form.links, website: e.target.value } })}
                    className="mt-1 block w-full border rounded p-2"
                    placeholder="https://your-site.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Другая ссылка</label>
                  <input
                    value={form.links.other}
                    onChange={(e) => setForm({ ...form, links: { ...form.links, other: e.target.value } })}
                    className="mt-1 block w-full border rounded p-2"
                    placeholder="Behance, Telegram и т.д."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // cancel edits — reset form to profile values
                    const normalized = normalizeSettings(profile?.settings);
                    setForm({
                      fullName: profile?.fullName ?? '',
                      bio: profile?.bio ?? '',
                      links: {
                        github: normalized.links.github ?? "",
                        linkedin: normalized.links.linkedin ?? "",
                        website: normalized.links.website ?? "",
                        other: normalized.links.other ?? "",
                      },
                      certificates: normalized.certificates.map((c) => ({ title: c.title, url: c.url })),
                    });
                    setEditMode(false);
                  }}
                  className="px-4 py-2 rounded border bg-white text-gray-700"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
