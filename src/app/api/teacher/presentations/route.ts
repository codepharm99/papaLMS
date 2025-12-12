import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth";

type SlidePayload = {
  heading?: string;
  details?: string;
  imageDataUrl?: string;
  imageAuthorName?: string;
  imageAuthorUrl?: string;
};

const pickString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function sanitizeSlides(slides: unknown): SlidePayload[] {
  if (!Array.isArray(slides)) return [];
  return slides
    .map(s => {
      if (!s || typeof s !== "object") return null;
      const obj = s as Record<string, unknown>;
      const heading = pickString(obj.heading) || pickString(obj.text);
      const details = pickString(obj.details);
      const imageDataUrl = pickString(obj.imageDataUrl);
      const imageAuthorName = pickString(obj.imageAuthorName);
      const imageAuthorUrl = pickString(obj.imageAuthorUrl);
      if (!heading && !details && !imageDataUrl) return null;
      return {
        heading,
        details,
        imageDataUrl,
        imageAuthorName,
        imageAuthorUrl,
      };
    })
    .filter(Boolean) as SlidePayload[];
}

export async function GET() {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const items = await prisma.presentation.findMany({
    where: { teacherId: me.id },
    orderBy: { createdAt: "desc" },
  });

  const data = items.map(item => ({
    id: item.id,
    title: item.title,
    slides: (item.slides as SlidePayload[]) || [],
    createdAt: item.createdAt.getTime(),
  }));

  return NextResponse.json({ items: data });
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me || me.role !== "TEACHER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = pickString(body.title) || "Без названия";
  const slides = sanitizeSlides(body.slides);

  if (!slides.length) {
    return NextResponse.json({ error: "NO_SLIDES" }, { status: 400 });
  }

  const created = await prisma.presentation.create({
    data: {
      teacherId: me.id,
      title,
      slides,
    },
  });

  return NextResponse.json({
    item: {
      id: created.id,
      title: created.title,
      slides: slides,
      createdAt: created.createdAt.getTime(),
    },
  });
}
