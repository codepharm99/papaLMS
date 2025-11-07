// src/lib/validators.ts
import { z } from "zod";

/** Базовые примитивы */
export const IdSchema = z.string().min(1); // id как строка (cuid/uuid/число-строкой)
export const EmailSchema = z.string().email();
export const PasswordSchema = z.string().min(6);
export const RoleSchema = z.enum(["TEACHER", "STUDENT"]);

export const TitleSchema = z.string().min(1).max(120);
export const ShortDescSchema = z.string().min(1).max(280);
export const BodySchema = z.string().min(1).max(2000);
export const TextOrLinkSchema = z.union([
  z.string().url(),
  z.string().min(1).max(2000),
]);

export const OrgTagSchema = z.string().min(1).max(24);
export const ISODateTimeSchema = z.string().datetime(); // 2025-11-08T10:00:00.000Z
export const ISODateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dateISO must be YYYY-MM-DD");

/** AUTH */
export const AuthLoginBodySchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export const AuthMeResponseSchema = z.object({
  user: z.object({
    id: IdSchema,
    name: z.string(),
    role: RoleSchema,
  }),
});

/** COURSES */
export const CoursesQuerySchema = z.object({
  query: z.string().optional(),
  orgTag: OrgTagSchema.optional(),
});

export const EnrollPostSchema = z.object({
  courseId: IdSchema,
});
export const EnrollDeleteQuerySchema = z.object({
  courseId: IdSchema,
});

/** MATERIALS */
export const MaterialsGetQuerySchema = z.object({
  courseId: IdSchema,
});
export const MaterialsPostSchema = z.object({
  courseId: IdSchema,
  title: TitleSchema,
  type: z.enum(["link", "text"]),
  value: z.string().min(1).max(2000),
});

/** ASSIGNMENTS */
export const AssignmentsGetQuerySchema = z.object({
  courseId: IdSchema,
});
export const AssignmentsPostSchema = z.object({
  courseId: IdSchema,
  title: TitleSchema,
  description: BodySchema,
  dueAtISO: ISODateTimeSchema,
});

/** SUBMISSIONS */
export const SubmissionsGetQuerySchema = z.object({
  assignmentId: IdSchema,
});
export const SubmissionsPostSchema = z.object({
  assignmentId: IdSchema,
  textOrLink: TextOrLinkSchema,
});

/** GRADES */
export const GradesPatchSchema = z.object({
  submissionId: IdSchema,
  grade: z.number().int().min(0).max(100),
  feedback: BodySchema.optional(),
});

/** ANNOUNCEMENTS */
export const AnnouncementsGetQuerySchema = z.object({
  courseId: IdSchema,
});
export const AnnouncementsPostSchema = z.object({
  courseId: IdSchema,
  title: TitleSchema,
  body: BodySchema,
});

/** SESSIONS & ATTENDANCE */
export const SessionsPostSchema = z.object({
  courseId: IdSchema,
  dateISO: ISODateSchema,
});

export const AttendanceGetQuerySchema = z.object({
  courseId: IdSchema,
  sessionId: IdSchema.optional(),
});
export const AttendancePostSchema = z.object({
  sessionId: IdSchema,
  studentId: IdSchema,
  status: z.enum(["present", "absent"]),
});

/** Удобные типы */
export type AuthLoginBody = z.infer<typeof AuthLoginBodySchema>;
export type CoursesQuery = z.infer<typeof CoursesQuerySchema>;
export type EnrollPostBody = z.infer<typeof EnrollPostSchema>;
export type MaterialsPostBody = z.infer<typeof MaterialsPostSchema>;
export type AssignmentsPostBody = z.infer<typeof AssignmentsPostSchema>;
export type SubmissionsPostBody = z.infer<typeof SubmissionsPostSchema>;
export type GradesPatchBody = z.infer<typeof GradesPatchSchema>;
export type AnnouncementsPostBody = z.infer<typeof AnnouncementsPostSchema>;
export type SessionsPostBody = z.infer<typeof SessionsPostSchema>;
export type AttendancePostBody = z.infer<typeof AttendancePostSchema>;
