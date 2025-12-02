"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TestItem = {
  id: string;
  title: string;
  description?: string | null;
  publicCode?: string | null;
  publishedAt?: number | null;
  createdAt: number;
};
type QuestionItem = { id: string; testId: string; text: string; options?: string[]; correctIndex?: number; createdAt: number };
type StudentItem = { id: string; name: string };
type StudentStatus = { id: string; name: string; status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED"; timestamp: number };
type QuestionPayload = { text: string; options?: string[]; correctIndex?: number | null };
type GuestAttempt = { id: string; name: string; score: number; total: number; createdAt: number };

export default function EditTestPage() {
  const params = useParams<{ id: string }>();
  const testId = params?.id as string;

  const [test, setTest] = useState<TestItem | null>(null);
  const [, setQuestions] = useState<QuestionItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentStatus, setStudentStatus] = useState<StudentStatus[]>([]);
  const [guestAttempts, setGuestAttempts] = useState<GuestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [guestLoading, setGuestLoading] = useState(true);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [options, setOptions] = useState<string[]>([""]);
  const [correct, setCorrect] = useState<number | null>(null);

  const [assignStudentId, setAssignStudentId] = useState("");
  const [assignDueAt, setAssignDueAt] = useState("");
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  // --- Загрузка теста и вопросов ---
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/teacher/tests/${testId}/questions`);
        const data = await res.json();
        if (!cancelled) {
          setTest(data.test);
          setQuestions(data.items ?? []);
        }
      } catch (e) {
        console.error("Ошибка загрузки теста:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (testId) load();
    return () => { cancelled = true; };
  }, [testId]);

  // --- Загрузка студентов ---
  useEffect(() => {
    let cancelled = false;
    async function loadStudents() {
      try {
        const res = await fetch("/api/teacher/students");
        const j = await res.json();
        if (!cancelled) {
          setStudents(j.data ?? []);
          if (j.data?.length) setAssignStudentId(j.data[0].id);
        }
      } catch (e) { console.error(e); }
    }
    loadStudents();
    return () => { cancelled = true; };
  }, []);

  // --- Загрузка статуса студентов для текущего теста ---
  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      setStatusLoading(true);
      try {
        const res = await fetch(`/api/teacher/tests/${testId}/status`);
        if (!res.ok) throw new Error(`Статус ${res.status}`);
        const data: StudentStatus[] = await res.json();
        if (!cancelled) setStudentStatus(data);
      } catch (e) { console.error("Ошибка загрузки статуса студентов:", e); }
      finally { if (!cancelled) setStatusLoading(false); }
    }
    if (testId) loadStatus();
    return () => { cancelled = true; };
  }, [testId]);

  // --- Гостевые попытки ---
  useEffect(() => {
    let cancelled = false;
    async function loadGuests() {
      setGuestLoading(true);
      setGuestError(null);
      try {
        const res = await fetch(`/api/teacher/tests/${testId}/guests`);
        if (!res.ok) throw new Error(`Статус ${res.status}`);
        const data: GuestAttempt[] = await res.json();
        if (!cancelled) setGuestAttempts(data);
      } catch (e) {
        if (!cancelled) setGuestError(e instanceof Error ? e.message : "Ошибка загрузки гостевых попыток");
      } finally {
        if (!cancelled) setGuestLoading(false);
      }
    }
    if (testId) loadGuests();
    return () => { cancelled = true; };
  }, [testId]);

  // --- Работа с вариантами ---
  const addOption = () => setOptions(prev => [...prev, ""]);
  const removeOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx));
    if (correct === idx) setCorrect(null);
    if (correct !== null && idx < correct) setCorrect(correct - 1);
  };

  const canSubmit = useMemo(() => {
    const filled = options.map(o => o.trim()).filter(Boolean);
    if (filled.length === 0) return text.trim().length > 0;
    if (correct == null) return false;
    return text.trim().length > 0 && correct >= 0 && correct < filled.length;
  }, [text, options, correct]);

  const isPublished = !!test?.publishedAt;
  const shareLink = useMemo(() => {
    if (!test?.publicCode) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/tests/${test.publicCode}`;
  }, [test?.publicCode]);

  const handlePublish = async () => {
    if (!testId) return;
    setPublishError(null);
    setPublishLoading(true);
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/publish`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Не удалось опубликовать");
      setTest(j.item);
    } catch (e: unknown) {
      setPublishError(e instanceof Error ? e.message : "Ошибка публикации");
    } finally {
      setPublishLoading(false);
    }
  };

  // --- Добавление вопроса ---
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublished) return;
    const filled = options.map(o => o.trim()).filter(Boolean);
    const body: QuestionPayload = { text };
    if (filled.length) {
      body.options = filled;
      body.correctIndex = correct ?? null;
    }
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (res.ok) { setQuestions(prev => [...prev, j.item]); setText(""); setOptions([""]); setCorrect(null); }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Инструменты", href: "/teacher/tools" },
        { label: "Тестирование", href: "/teacher/tests" },
        { label: test?.title || "Редактирование теста" },
      ]} />

      {loading ? <div>Загрузка теста...</div> : (
        <>
          {/* Публикация и ссылка */}
          <section className="border p-4 rounded-xl bg-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Публикация</h2>
                <p className="text-sm text-gray-600">
                  После публикации редактирование вопросов будет заблокировано. Ссылка открыта для всех.
                </p>
              </div>
              <Button variant="secondary" onClick={handlePublish} disabled={publishLoading || isPublished}>
                {isPublished ? "Уже опубликован" : publishLoading ? "Публикую..." : "Опубликовать"}
              </Button>
            </div>
            {publishError && <div className="text-sm text-red-600">{publishError}</div>}
            {isPublished && shareLink && (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center">
                <div className="grid gap-2">
                  <div className="text-sm text-gray-700">Публичная ссылка</div>
                  <div className="flex gap-2">
                    <Input readOnly value={shareLink} />
                    <Button type="button" onClick={() => navigator.clipboard.writeText(shareLink)}>Скопировать</Button>
                  </div>
                </div>
                <div className="justify-self-end rounded-lg border bg-white p-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareLink)}`}
                    alt="QR-код для ссылки"
                    className="h-[180px] w-[180px]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Добавление вопросов */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Добавить вопрос</h2>
            {isPublished ? (
              <div className="text-sm text-gray-600">Тест опубликован. Вопросы больше редактировать нельзя.</div>
            ) : (
              <form onSubmit={handleAdd} className="grid gap-2">
                <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Введите вопрос" required />
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="radio" checked={correct===i} onChange={()=>setCorrect(i)} title="Правильный ответ" />
                    <Input value={opt} onChange={e=>setOptions(prev=>prev.map((v,j)=>j===i?e.target.value:v))} placeholder={`Вариант ${i+1}`} />
                    <Button type="button" onClick={()=>removeOption(i)}>Удалить</Button>
                  </div>
                ))}
                <Button type="button" onClick={addOption}>Добавить вариант</Button>
                <Button type="submit" disabled={!canSubmit}>Сохранить вопрос</Button>
              </form>
            )}
          </section>

          {/* Назначение теста */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Назначить тест студенту</h2>
            <form onSubmit={async e=>{
              e.preventDefault();
              try {
                const res = await fetch("/api/teacher/assignments", {
                  method:"POST",
                  headers:{"Content-Type":"application/json"}, 
                  body: JSON.stringify({ testId, studentId: assignStudentId, dueAt: assignDueAt||null })
                });
                setAssignMsg(res.ok ? "Назначение создано" : "Ошибка при назначении");
              } catch (err) { console.error(err); }
            }} className="grid gap-2">
              <select value={assignStudentId} onChange={e=>setAssignStudentId(e.target.value)}>
                {students.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Input type="datetime-local" value={assignDueAt} onChange={e=>setAssignDueAt(e.target.value)} />
              <Button type="submit">Назначить</Button>
              {assignMsg && <span className="text-sm text-gray-600">{assignMsg}</span>}
            </form>
          </section>

          {/* Статус студентов */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Статус теста</h2>
            {statusLoading ? <div>Загрузка статуса студентов...</div> : (
              <div className="space-y-2">
                <div>
                  <h3 className="font-medium text-gray-700">Не начат</h3>
                  <ul className="ml-4 list-disc">
                    {studentStatus.filter(s => s.status==="ASSIGNED").map(s => (
                      <li key={`${s.id}-${s.timestamp}`} className="text-gray-500">{s.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-orange-700">В процессе</h3>
                  <ul className="ml-4 list-disc">
                    {studentStatus.filter(s => s.status==="IN_PROGRESS").map(s => (
                      <li key={`${s.id}-${s.timestamp}`} className="text-orange-500">{s.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-green-700">Сдано</h3>
                  <ul className="ml-4 list-disc">
                    {studentStatus.filter(s => s.status==="COMPLETED").map(s => (
                      <li key={`${s.id}-${s.timestamp}`} className="text-green-600">{s.name}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* Гостевые попытки */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Гостевые сдачи по ссылке</h2>
            {guestLoading ? (
              <div>Загрузка...</div>
            ) : guestError ? (
              <div className="text-sm text-red-600">{guestError}</div>
            ) : guestAttempts.length === 0 ? (
              <div className="text-sm text-gray-600">Пока никто не сдавал тест по публичной ссылке.</div>
            ) : (
              <div className="space-y-2">
                {guestAttempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{a.score} / {a.total}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
