"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/components/user-context";
import { useLanguage } from "@/components/language-context";

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
  const [history, setHistory] = useState<ProfileShape[]>([]);
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
  const [previewCert, setPreviewCert] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; type?: "info" | "success" | "error"; message: string; visible: boolean }>>([]);
  const { language } = useLanguage();
  const tr = (ru: string, en: string) => (language === "ru" ? ru : en);

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

  const validateForm = (state: FormState) => {
    const nextErrors: Record<string, string> = {};
    if (!state.fullName.trim()) nextErrors.fullName = "Укажите имя";
    const urlFields: Array<keyof FormState["links"]> = ["github", "linkedin", "website", "other"];
    urlFields.forEach((field) => {
      const v = state.links[field];
      if (v && !/^https?:\/\//i.test(v.trim())) {
        nextErrors[field] = "Ссылка должна начинаться с http(s)://";
      }
    });
    return nextErrors;
  };

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const validation = validateForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      showToast(tr("Заполните обязательные поля", "Please fill required fields"), "error");
      return;
    }
    setSaving(true);
    try {
      const settingsPayload = buildSettingsPayload(form);
      const hasCertificateFiles = form.certificates.some((c) => c.file);
      let res: Response;
      const wantsAvatarRemoval = Boolean(profile?.avatarUrl) && !avatarFile && !avatarPreview;
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
        if (wantsAvatarRemoval) bodyPayload.avatarUrl = null;
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
      if (profile) setHistory((h) => [...h.slice(-2), profile]);
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
      showToast(tr("Профиль сохранён", "Profile saved"), "success");
    } catch (err: any) {
      console.error("Save error:", err);
      showToast(err?.message ?? tr("Ошибка при сохранении профиля", "Error saving profile"), "error");
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

  const computeCompletion = (input: {
    fullName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    links?: ProfileLinks | FormState["links"];
    certificates?: Array<{ title: string; url?: string; file?: File | null } | ProfileCertificate>;
  }) => {
    const hasName = Boolean(input.fullName?.trim());
    const hasBio = Boolean(input.bio?.trim());
    const hasAvatar = Boolean(input.avatarUrl);
    const hasLinks = input.links ? Object.values(input.links).some((v) => Boolean((v ?? "").toString().trim())) : false;
    const hasCertificates = Array.isArray(input.certificates) && input.certificates.length > 0;

    const parts = [
      { ok: hasName, label: "Имя" },
      { ok: hasBio, label: "О себе" },
      { ok: hasAvatar, label: "Фото" },
      { ok: hasLinks, label: "Ссылки" },
      { ok: hasCertificates, label: "Сертификаты" },
    ];
    const percent = Math.round((parts.filter((p) => p.ok).length / parts.length) * 100);
    const missing = parts.filter((p) => !p.ok).map((p) => p.label);
    return { percent, missing, parts };
  };

  const rollbackLast = async () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setSaving(true);
    try {
      const normalized = normalizeSettings(prev.settings);
      const body: any = {
        fullName: prev.fullName ?? "",
        bio: prev.bio ?? "",
        avatarUrl: prev.avatarUrl ?? null,
        settings: { links: normalized.links, certificates: normalized.certificates },
      };
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Не удалось откатить изменения");
      const data = await res.json();
      setProfile(data.profile);
      setHistory((h) => h.slice(0, -1));
      const normalizedCurrent = normalizeSettings(data.profile.settings);
      setForm({
        fullName: data.profile.fullName ?? "",
        bio: data.profile.bio ?? "",
        links: {
          github: normalizedCurrent.links.github ?? "",
          linkedin: normalizedCurrent.links.linkedin ?? "",
          website: normalizedCurrent.links.website ?? "",
          other: normalizedCurrent.links.other ?? "",
        },
        certificates: normalizedCurrent.certificates.map((c) => ({ title: c.title, url: c.url })),
      });
      showToast(tr("Изменения откатены", "Changes reverted"), "success");
    } catch (err: any) {
      showToast(err?.message ?? tr("Ошибка при откате", "Error while reverting"), "error");
    } finally {
      setSaving(false);
    }
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

  const readableLink = (url: string) => {
    try {
      const u = new URL(url);
      return u.host.replace(/^www\./, "");
    } catch (e) {
      return url;
    }
  };

  const handleFile = (f: File) => {
    const allowed = ["image/png", "image/jpeg"];
    if (!allowed.includes(f.type)) {
      showToast(tr("Разрешены только PNG и JPG (jpeg). SVG и другие форматы отклоняются.", "Only PNG and JPG (jpeg) are allowed. SVG and other formats are rejected."), "error");
      return;
    }
    if (f.size > MAX_AVATAR_BYTES) {
      showToast(tr(`Файл слишком большой — максимум ${humanFileSize(MAX_AVATAR_BYTES)}`, `File is too large — max ${humanFileSize(MAX_AVATAR_BYTES)}`), "error");
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
      showToast(tr("Сертификаты принимаются только в формате PDF.", "Certificates must be PDF only."), "error");
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
        <h1 className="text-2xl font-semibold mb-4">{tr("Мой профиль", "My profile")}</h1>
        <p className="mb-4">{tr("Вы не авторизованы. Пожалуйста, войдите, чтобы посмотреть или редактировать профиль.", "You are not signed in. Please log in to view or edit your profile.")}</p>
        <div className="flex gap-2">
          <button onClick={() => router.push('/login')} className="px-4 py-2 rounded bg-blue-600 text-white">
            {tr("Войти", "Log in")}
          </button>
        </div>
      </div>
    );

  const normalizedSettings = normalizeSettings(profile?.settings);
  const completionInfo = computeCompletion({
    fullName: editMode ? form.fullName : profile?.fullName,
    bio: editMode ? form.bio : profile?.bio,
    avatarUrl: editMode ? avatarPreview ?? profile?.avatarUrl : profile?.avatarUrl ?? avatarPreview,
    links: editMode ? form.links : normalizedSettings.links,
    certificates: editMode ? form.certificates : normalizedSettings.certificates,
  });

  const achievements = [
    { label: tr("Био заполнено", "Bio filled"), ok: completionInfo.parts.find((p) => p.label === "О себе")?.ok },
    { label: tr("Фото загружено", "Photo uploaded"), ok: completionInfo.parts.find((p) => p.label === "Фото")?.ok },
    { label: tr("Ссылки добавлены", "Links added"), ok: completionInfo.parts.find((p) => p.label === "Ссылки")?.ok },
    { label: tr("Сертификаты", "Certificates"), ok: completionInfo.parts.find((p) => p.label === "Сертификаты")?.ok },
  ];
  const linkIcons: Record<string, JSX.Element> = {
    github: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.11 3.29 9.45 7.86 10.98.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.39-3.88-1.39-.53-1.36-1.29-1.72-1.29-1.72-1.05-.73.08-.72.08-.72 1.16.08 1.78 1.2 1.78 1.2 1.04 1.79 2.72 1.27 3.39.97.11-.76.41-1.27.75-1.56-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.27 1.19-3.07-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.17a11.1 11.1 0 0 1 5.8 0c2.2-1.48 3.17-1.17 3.17-1.17.63 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.41-2.68 5.38-5.24 5.67.42.36.8 1.08.8 2.18 0 1.57-.02 2.83-.02 3.22 0 .31.21.68.8.56a10.53 10.53 0 0 0 7.85-10.98C23.5 5.73 18.27.5 12 .5Z" />
      </svg>
    ),
    linkedin: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M4.98 3.5a2.5 2.5 0 1 1-.01 5.001 2.5 2.5 0 0 1 .01-5Zm.02 5.981H1V21h4V9.481Zm6.482 0H7.5V21h4v-5.76c0-3.204 4-3.463 4 0V21h4v-6.93c0-5.6-6.064-5.395-7.018-2.64V9.481Z" />
      </svg>
    ),
    website: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm6.93 9H16.1a14.24 14.24 0 0 0-.94-5.02A8.02 8.02 0 0 1 18.93 11ZM12 4c.74 0 1.95 1.92 2.45 5H9.55C10.05 5.92 11.26 4 12 4ZM8.84 5.98A14.24 14.24 0 0 0 7.9 11H5.07a8.02 8.02 0 0 1 3.77-5.02ZM5.07 13H7.9c.17 1.7.59 3.33 1.34 4.68A8.02 8.02 0 0 1 5.07 13ZM12 20c-.74 0-1.95-1.92-2.45-5h4.9C13.95 18.08 12.74 20 12 20Zm3.16-2.32c.75-1.35 1.17-2.98 1.34-4.68h2.83a8.02 8.02 0 0 1-3.77 4.68Z" />
      </svg>
    ),
    other: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z" />
      </svg>
    ),
  };

  const themeBg = "from-sky-800 via-cyan-700 to-emerald-600";
  const overlayTint = "bg-white/70";
  const panelBg = "bg-white/85 border-indigo-50 text-gray-900";
  const cardBg = "bg-white/80 border-indigo-50 text-gray-900";
  const cardShadow = "shadow-indigo-100/70";
  const avatarBusy = saving && (avatarFile || (profile?.avatarUrl && !avatarPreview));
  const labelTone = "text-gray-700";
  const subtleTone = "text-gray-500";
  const linkTone = "text-indigo-700";
  const linkSubtle = "text-gray-600";
  const accentBubble = "bg-indigo-100";

  return (
    <div className="relative max-w-4xl mx-auto p-6 md:p-8 text-gray-900">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(99,102,241,0.14),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(236,72,153,0.12),transparent_35%),radial-gradient(circle_at_20%_90%,rgba(16,185,129,0.12),transparent_30%)] opacity-90" />
        <div className={`absolute inset-4 rounded-[32px] ${overlayTint} blur-3xl`} />
      </div>
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
      <header className={`relative overflow-hidden mb-6 rounded-2xl border border-white/10 bg-gradient-to-br ${themeBg} text-white shadow-xl shadow-emerald-200/40`}>
        <div className="absolute inset-0">
          <div className="absolute -left-10 -top-16 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-6 bottom-[-56px] h-44 w-44 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.26),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(52,211,153,0.2),transparent_30%)]" />
        </div>
        <div className="relative p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-white/70">Профиль</p>
              <h1 className="text-3xl font-semibold leading-tight">{tr("Мой профиль", "My profile")}</h1>
              <p className="text-sm opacity-90 max-w-2xl">
                {tr("Удобное место, где можно обновить свою историю, фото и ссылки на важные проекты.", "A handy place to update your story, photo, and important links.")}
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{tr("Быстрые правки", "Quick edits")}</span>
                <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{tr("Важные ссылки", "Important links")}</span>
                <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{tr("Сертификаты", "Certificates")}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center justify-end">
              <button
                onClick={rollbackLast}
                disabled={!history.length || saving}
                className={`rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur transition ${
                  history.length ? "border-white/40 bg-white/10 hover:bg-white/20" : "border-white/20 bg-white/5 opacity-50"
                }`}
              >
                Откатить
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="rounded-2xl border border-white/30 bg-white/10 backdrop-blur px-4 py-3 shadow-lg shadow-indigo-900/20 w-full sm:w-auto">
              <div className="text-[11px] uppercase tracking-wide text-white/70">{tr("Заполненность", "Completion")}</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-3xl font-semibold">{completionInfo.percent}%</div>
                <div className="h-2 w-full sm:w-28 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-white transition-[width] duration-500 ease-out" style={{ width: `${completionInfo.percent}%` }} />
                </div>
              </div>
              <div className="mt-2 text-xs text-white/80">
                {completionInfo.missing.length > 0
                  ? tr(`Добавьте: ${completionInfo.missing.join(", ")}`, `Add: ${completionInfo.missing.join(", ")}`)
                  : tr("Отлично, всё заполнено!", "Great, everything is filled!")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(completionInfo.missing.length ? completionInfo.missing : ["Готово"]).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-black/10 px-4 py-3 backdrop-blur-sm w-full sm:w-auto">
              <div className="text-sm font-semibold">{tr("Документы", "Documents")}</div>
              <div className="text-2xl font-semibold leading-tight">{normalizedSettings.certificates.length}</div>
              <div className="text-xs text-white/70">{tr("сертификатов в профиле", "certificates in profile")}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => (
              <span
                key={a.label}
                className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
                  a.ok ? "bg-white/25 text-white" : "bg-black/20 text-white/70"
                }`}
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className={`relative col-span-1 rounded-2xl border ${cardBg} p-6 shadow-xl ${cardShadow} backdrop-blur transition-transform hover:-translate-y-0.5`}>
          <div className={`pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full ${accentBubble} blur-2xl`} />
          <div className="flex flex-col items-center">
            {profile?.avatarUrl ? (
              <div className="w-32 h-32 rounded-full overflow-hidden mb-4 ring-4 ring-indigo-50 shadow-lg shadow-indigo-200/60 relative">
                <img src={profile.avatarUrl} alt="avatar" className={`w-full h-full object-cover ${avatarBusy ? "opacity-70" : ""}`} />
                {avatarBusy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center text-2xl font-semibold text-indigo-800 mb-4 shadow-inner relative">
                {initials(profile?.fullName ?? user?.name ?? '')}
                {avatarBusy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm">
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            )}

              <div className="text-center">
                <div className="text-lg font-medium">{profile?.fullName ?? user?.name ?? 'Без имени'}</div>
                <div className={`text-sm mt-1 ${subtleTone}`}>{user?.role ?? '—'}</div>
                <div className="mt-3 text-sm text-gray-600">{profile?.email ?? '—'}</div>
              </div>

            <div className="mt-6 w-full flex gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className="w-full px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-fuchsia-500 text-white shadow-md shadow-indigo-200/60 hover:brightness-110 transition"
              >
                {editMode ? tr("Отмена", "Cancel") : tr("Редактировать профиль", "Edit profile")}
              </button>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={rollbackLast}
                  disabled={saving}
                  className="px-3 py-2 rounded-md border border-indigo-200 text-sm text-indigo-700 hover:bg-indigo-50 transition"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Edit / Details Panel */}
        <div className={`col-span-1 md:col-span-2 ${panelBg} backdrop-blur rounded-2xl p-6 md:p-7 shadow-lg ${cardShadow}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{tr("Данные профиля", "Profile data")}</h2>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{tr("Обновлено сейчас", "Updated now")}</span>
          </div>

          {!editMode && (
            <div className="space-y-4">
              <div>
                <div className={`text-sm ${subtleTone}`}>{tr("Полное имя", "Full name")}</div>
                <div className="mt-1 text-base">{profile?.fullName ?? '—'}</div>
              </div>

              <div>
                <div className={`text-sm ${subtleTone}`}>{tr("О себе", "About")}</div>
                <div className="mt-1 text-base whitespace-pre-wrap">{profile?.bio ?? '—'}</div>
              </div>

              <div>
                <div className={`text-sm ${subtleTone}`}>{tr("Сертификаты (PDF)", "Certificates (PDF)")}</div>
                <div className="mt-2 space-y-2">
                  {normalizedSettings.certificates.length > 0 ? (
                    normalizedSettings.certificates.map((c, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${linkTone} hover:bg-indigo-50`}
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewCert(c.url)}
                          className="flex items-center gap-2 truncate hover:underline"
                        >
                          <span className="truncate">{c.title}</span>
                        </button>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>PDF</span>
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                            ↗
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`text-sm ${subtleTone}`}>Сертификаты пока не добавлены.</div>
                  )}
                </div>
              </div>

              <div>
                <div className={`text-sm ${subtleTone}`}>{tr("Полезные ссылки", "Useful links")}</div>
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
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${linkTone} hover:bg-indigo-50`}
                        >
                          <span className="flex items-center gap-2 capitalize">
                            <span className="text-indigo-600">{linkIcons[k] ?? linkIcons.other}</span>
                            {k}
                          </span>
                          <span className={`truncate pl-2 ${linkSubtle}`}>{readableLink(v)}</span>
                        </a>
                      ))
                  ) : (
                    <div className={`text-sm ${subtleTone}`}>{tr("Нет добавленных ссылок.", "No links yet.")}</div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button onClick={() => setEditMode(true)} className="px-4 py-2 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition">
                  {tr("Редактировать", "Edit")}
                </button>
              </div>
            </div>
          )}

          {editMode && (
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${labelTone}`}>{tr("Аватар", "Avatar")}</label>
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
                            {tr("Изменить", "Change")}
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
                              {tr("Удалить", "Remove")}
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
                <label className={`block text-sm font-medium ${labelTone}`}>{tr("Полное имя", "Full name")}</label>
                <input
                  value={form.fullName}
                  onChange={(e) => {
                    clearError("fullName");
                    setForm({ ...form, fullName: e.target.value });
                  }}
                  className={`mt-1 block w-full border rounded p-2 ${errors.fullName ? "border-red-500 ring-1 ring-red-300" : ""}`}
                  placeholder={tr("Иван Иванов", "John Doe")}
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>

              <div>
                <label className={`block text-sm font-medium ${labelTone}`}>{tr("О себе", "About")}</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={6}
                  className="mt-1 block w-full border rounded p-2"
                  placeholder={tr("Короткая биография", "Short bio")}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={`block text-sm font-medium ${labelTone}`}>{tr("Сертификаты (PDF)", "Certificates (PDF)")}</label>
                  <button
                    type="button"
                    onClick={() => certificateInputRef.current?.click()}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    {tr("Загрузить файл", "Upload file")}
                  </button>
                </div>
                <p className={`mt-1 text-xs ${subtleTone}`}>{tr("Прикрепите PDF-файлы сертификатов. Их можно переименовать ниже.", "Attach certificate PDFs. You can rename them below.")}</p>
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
                    <div className="text-sm text-gray-500">{tr("Пока нет прикреплённых сертификатов.", "No certificates yet.")}</div>
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
                          placeholder={tr("Название сертификата", "Certificate title")}
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
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setPreviewCert(c.url)} className="text-indigo-600 hover:underline">
                              Смотреть
                            </button>
                            <a href={c.url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-indigo-600">
                              ↗
                            </a>
                          </div>
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
                  <label className={`block text-sm font-medium ${labelTone}`}>GitHub</label>
                  <input
                    value={form.links.github}
                    onChange={(e) => {
                      clearError("github");
                      setForm({ ...form, links: { ...form.links, github: e.target.value } });
                    }}
                    className={`mt-1 block w-full border rounded p-2 ${errors.github ? "border-red-500 ring-1 ring-red-300" : ""}`}
                    placeholder="https://github.com/username"
                  />
                  {errors.github && <p className="mt-1 text-xs text-red-600">{errors.github}</p>}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${labelTone}`}>LinkedIn</label>
                  <input
                    value={form.links.linkedin}
                    onChange={(e) => {
                      clearError("linkedin");
                      setForm({ ...form, links: { ...form.links, linkedin: e.target.value } });
                    }}
                    className={`mt-1 block w-full border rounded p-2 ${errors.linkedin ? "border-red-500 ring-1 ring-red-300" : ""}`}
                    placeholder="https://www.linkedin.com/in/username"
                  />
                  {errors.linkedin && <p className="mt-1 text-xs text-red-600">{errors.linkedin}</p>}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${labelTone}`}>Портфолио / сайт</label>
                  <input
                    value={form.links.website}
                    onChange={(e) => {
                      clearError("website");
                      setForm({ ...form, links: { ...form.links, website: e.target.value } });
                    }}
                    className={`mt-1 block w-full border rounded p-2 ${errors.website ? "border-red-500 ring-1 ring-red-300" : ""}`}
                    placeholder="https://your-site.com"
                  />
                  {errors.website && <p className="mt-1 text-xs text-red-600">{errors.website}</p>}
                </div>
                <div>
                  <label className={`block text-sm font-medium ${labelTone}`}>Другая ссылка</label>
                  <input
                    value={form.links.other}
                    onChange={(e) => {
                      clearError("other");
                      setForm({ ...form, links: { ...form.links, other: e.target.value } });
                    }}
                    className={`mt-1 block w-full border rounded p-2 ${errors.other ? "border-red-500 ring-1 ring-red-300" : ""}`}
                    placeholder="Behance, Telegram и т.д."
                  />
                  {errors.other && <p className="mt-1 text-xs text-red-600">{errors.other}</p>}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">
                  {saving ? tr("Сохранение…", "Saving…") : tr("Сохранить", "Save")}
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
                  {tr("Отмена", "Cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {previewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white text-gray-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div className="font-semibold text-sm">Предпросмотр PDF</div>
              <div className="flex gap-2">
                <a href={previewCert} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">
                  Открыть в новой вкладке
                </a>
                <button onClick={() => setPreviewCert(null)} className="text-sm px-2 py-1 rounded hover:bg-slate-200/50">
                  ✕
                </button>
              </div>
            </div>
            <div className="h-[70vh]">
              <iframe src={previewCert} className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
