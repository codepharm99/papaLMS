"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TestItem = { id: string; title: string; description?: string; createdAt: number };
type QuestionItem = { id: string; testId: string; text: string; options?: string[]; correctIndex?: number; createdAt: number };
type StudentItem = { id: string; name: string };
type StudentStatus = { id: string; name: string; status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED"; timestamp: number };

export default function EditTestPage() {
  const params = useParams<{ id: string }>();
  const testId = params?.id as string;

  const [test, setTest] = useState<TestItem | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentStatus, setStudentStatus] = useState<StudentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);

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
        const data: StudentStatus[] = await res.json();
        if (!cancelled) setStudentStatus(data);
      } catch (e) { console.error("Ошибка загрузки статуса студентов:", e); }
      finally { if (!cancelled) setStatusLoading(false); }
    }
    if (testId) loadStatus();
    return () => { cancelled = true; };
  }, [testId]);

  // --- Работа с вариантами ---
  const addOption = () => setOptions(prev => [...prev, ""]);
  const removeOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx));
    if (correct === idx) setCorrect(null);
    if (correct && idx < correct) setCorrect(correct - 1);
  };

  const canSubmit = useMemo(() => {
    const filled = options.map(o => o.trim()).filter(Boolean);
    if (filled.length === 0) return text.trim().length > 0;
    if (correct == null) return false;
    return text.trim().length > 0 && correct >= 0 && correct < filled.length;
  }, [text, options, correct]);

  // --- Добавление вопроса ---
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = options.map(o => o.trim()).filter(Boolean);
    const body: any = { text };
    if (filled.length) { body.options = filled; body.correctIndex = correct; }
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
          {/* Добавление вопросов */}
          <section className="border p-4 rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">Добавить вопрос</h2>
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
        </>
      )}
    </div>
  );
}
