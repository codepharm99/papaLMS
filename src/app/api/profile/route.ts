// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    const url = new URL(req.url);
    const debug = url.searchParams.get("_debug") === "1";
    if (debug) {
      // For debug mode return which cookies the server sees and whether currentUser resolved.
      const cookieHeader = req.headers.get("cookie") ?? "";
      const candidateNames = ["token", "next-auth.session-token", "next-auth.csrf-token", "next-auth.callback-url"];
      const present = candidateNames.filter((n) => cookieHeader.includes(n));
      return NextResponse.json({ debug: { presentCookies: present, cookieHeaderSnippet: cookieHeader.slice(0, 300), userResolved: !!user } });
    }
    if (!user) throw new Error("Unauthenticated");
    // получаем профиль, если есть — иначе null
    let profile = null;
    try {
      profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    } catch (e) {
      // If the Profile table doesn't exist (dev/migration drift), don't fail the whole request.
      // Log and continue with profile = null so UI can render and offer to create a profile.
      console.warn("Profile lookup failed (table may be missing)", e);
      profile = null;
    }

    // подтянем email из базы (mock `user` может не содержать email)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    return NextResponse.json({ user: { id: user.id, email: dbUser?.email ?? null }, profile });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unauthenticated" }, { status: 401 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    if (!user) throw new Error("Unauthenticated");
    const existing = await prisma.profile.findUnique({ where: { userId: user.id } });
    const contentType = req.headers.get("content-type") ?? "";
    const updates: any = {};

    // Handle multipart/form-data (file upload) or JSON
    if (contentType.includes("multipart/form-data")) {
      // Use Request.formData() (Node/Next supports this in route handlers)
      const form = await req.formData();
      const fullName = form.get("fullName");
      const bio = form.get("bio");
      const avatar = form.get("avatar") as File | null;

      if (typeof fullName === "string") updates.fullName = fullName;
      if (typeof bio === "string") updates.bio = bio;

      // links + certificates metadata (titles + existing list)
      const settingsMetaRaw = form.get("settingsMeta");
      const metaDefaults = {
        links: (existing?.settings as any)?.links ?? {},
        existingCertificates: Array.isArray((existing as any)?.settings?.certificates) ? (existing as any).settings.certificates : [],
        newCertificates: [],
      };
      let settingsMeta = metaDefaults as {
        links?: any;
        existingCertificates?: any;
        newCertificates?: Array<{ title?: string }>;
      };
      if (typeof settingsMetaRaw === "string") {
        try {
          const parsed = JSON.parse(settingsMetaRaw);
          settingsMeta = { ...metaDefaults, ...parsed };
        } catch (e) {
          settingsMeta = metaDefaults;
        }
      }

      const certificateFiles = form
        .getAll("certificateFiles")
        .filter((f): f is File => f instanceof File && typeof (f as any).arrayBuffer === "function");
      const certificateTitles: string[] = Array.isArray(settingsMeta?.newCertificates)
        ? settingsMeta.newCertificates.map((c) => (typeof c?.title === "string" ? c.title : "Сертификат"))
        : [];

      const certificates: Array<{ title: string; url: string }> = Array.isArray(settingsMeta.existingCertificates)
        ? settingsMeta.existingCertificates
            .map((c: any) => (c && typeof c.title === "string" && typeof c.url === "string" ? { title: c.title, url: c.url } : null))
            .filter(Boolean)
        : [];

      if (avatar && typeof (avatar as any).arrayBuffer === "function") {
        const arrayBuffer = await (avatar as any).arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mime = (avatar as any).type;
        const allowed = ["image/png", "image/jpeg"];
        if (!allowed.includes(mime)) {
          throw new Error("Unsupported image type");
        }

        // Decide whether to upload to S3 or save locally
        const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET;
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
        const useS3 = !!bucket;
        const ext = mime === "image/png" ? "png" : "jpg";
        const filename = `${user.id}-${Date.now()}.${ext}`;

        if (useS3) {
          try {
            const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
            const s3 = new S3Client({ region });
            const key = `avatars/${filename}`;
            await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: mime }));
            // Public URL — prefer provided base if set
            const base = process.env.S3_BASE_URL || `https://${bucket}.s3.${region}.amazonaws.com`;
            updates.avatarUrl = `${base}/${key}`;
            // attempt to delete old S3 object if present (handled later)
          } catch (e) {
            console.warn('S3 upload failed, falling back to local storage', e);
            // fallback to local storage below
            const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
            await fs.mkdir(uploadsDir, { recursive: true });
            const filepath = path.join(uploadsDir, filename);
            await fs.writeFile(filepath, buffer);
            updates.avatarUrl = `/uploads/avatars/${filename}`;
          }
        } else {
          const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
          await fs.mkdir(uploadsDir, { recursive: true });
          const filepath = path.join(uploadsDir, filename);
          await fs.writeFile(filepath, buffer);
          updates.avatarUrl = `/uploads/avatars/${filename}`;
        }
      }

      // Upload new certificate PDFs (if any) and extend settings.certificates
      if (certificateFiles.length > 0) {
        const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET;
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
        const useS3 = !!bucket;
        for (let i = 0; i < certificateFiles.length; i++) {
          const file = certificateFiles[i];
          const title = certificateTitles[i] || file.name.replace(/\.pdf$/i, "");
          if (file.type !== "application/pdf") {
            throw new Error("Certificates must be PDF");
          }
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const filename = `${user.id}-cert-${Date.now()}-${i}.pdf`;
          if (useS3) {
            try {
              const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
              const s3 = new S3Client({ region });
              const key = `certificates/${filename}`;
              await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: "application/pdf" }));
              const base = process.env.S3_BASE_URL || `https://${bucket}.s3.${region}.amazonaws.com`;
              certificates.push({ title, url: `${base}/${key}` });
            } catch (e) {
              console.warn("S3 upload failed for certificate, falling back to local storage", e);
              const uploadsDir = path.join(process.cwd(), "public", "uploads", "certificates");
              await fs.mkdir(uploadsDir, { recursive: true });
              const filepath = path.join(uploadsDir, filename);
              await fs.writeFile(filepath, buffer);
              certificates.push({ title, url: `/uploads/certificates/${filename}` });
            }
          } else {
            const uploadsDir = path.join(process.cwd(), "public", "uploads", "certificates");
            await fs.mkdir(uploadsDir, { recursive: true });
            const filepath = path.join(uploadsDir, filename);
            await fs.writeFile(filepath, buffer);
            certificates.push({ title, url: `/uploads/certificates/${filename}` });
          }
        }
      }

      // Final settings update from multipart
      updates.settings = {
        links: settingsMeta?.links ?? {},
        certificates,
      };
    } else {
      const payload = await req.json();
      if (typeof payload.fullName === "string") updates.fullName = payload.fullName;
      if (typeof payload.bio === "string") updates.bio = payload.bio;
      if (typeof payload.avatarUrl === "string") updates.avatarUrl = payload.avatarUrl;
      if (payload.settings !== undefined) {
        const links = payload.settings?.links ?? (existing?.settings as any)?.links ?? {};
        const certificates = Array.isArray(payload.settings?.certificates)
          ? payload.settings.certificates.filter((c: any) => c && typeof c.title === "string" && typeof c.url === "string")
          : Array.isArray((existing as any)?.settings?.certificates)
            ? (existing as any).settings.certificates
            : [];
        updates.settings = { links, certificates };
      }
    }

    // before upsert: try to remove previous avatar file/object if replaced
    if (existing && existing.avatarUrl && updates.avatarUrl && existing.avatarUrl !== updates.avatarUrl) {
      try {
        const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET;
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
        const useS3 = !!bucket;
        if (useS3) {
          try {
            const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
            const s3 = new S3Client({ region });
            // try to derive key from existing.avatarUrl
            const base = process.env.S3_BASE_URL || `https://${bucket}.s3.${region}.amazonaws.com`;
            let key = null;
            if (existing.avatarUrl.startsWith(base)) {
              key = existing.avatarUrl.replace(base + '/', '');
            } else {
              try {
                const u = new URL(existing.avatarUrl);
                key = u.pathname.replace(/^\//, '');
              } catch (e) {
                key = null;
              }
            }
            if (key) {
              await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
            }
          } catch (e) {
            console.warn('Failed deleting old S3 avatar', e);
          }
        }

        // local file deletion
        if (existing.avatarUrl.startsWith('/uploads/avatars/')) {
          try {
            const localPath = path.join(process.cwd(), 'public', existing.avatarUrl.replace(/^\//, ''));
            await fs.unlink(localPath).catch(() => {});
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.warn('Error while removing previous avatar', e);
      }
    }

    // ensure we have an email for the profile create (schema requires it)
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const createObj: any = { userId: user.id, ...updates };
    // If creating a new profile and the account has no email, return a clear error
    if (!existing) {
      const resolvedEmail = dbUser?.email ?? (user as any)?.email ?? "";
      if (!resolvedEmail) {
        return NextResponse.json({ error: "Account must have an email before creating a profile" }, { status: 400 });
      }
      createObj.email = resolvedEmail;
    } else {
      if (!createObj.email) createObj.email = dbUser?.email ?? (user as any)?.email ?? "";
    }

    // debug: log the object we pass to Prisma upsert
    console.log('PROFILE UPSERT createObj:', createObj, 'updates:', updates);
    // upsert: если профиля нет — создаём, иначе обновляем
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: createObj,
      update: updates,
    });

    return NextResponse.json({ profile });
  } catch (err: any) {
    // 401 для неавторизованных, 400/500 для прочих ошибок
    const status = err?.message === "Unauthenticated" ? 401 : 400;
    return NextResponse.json({ error: err?.message ?? "Bad request" }, { status });
  }
}
