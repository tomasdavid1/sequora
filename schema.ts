import { z } from 'zod';
import {
  QuestionCategory,
  UserRole,
  MembershipTier,
  ThreadPromptType,
  TreatmentStatus,
  TreatmentItemStatus,
} from '@prisma/client';

// ---------- Enums ----------
export const QuestionCategoryEnum = z.nativeEnum(QuestionCategory);
export const UserRoleEnum = z.nativeEnum(UserRole);
export const MembershipTierEnum = z.nativeEnum(MembershipTier);
export const ThreadPromptTypeEnum = z.nativeEnum(ThreadPromptType);
export const TreatmentStatusEnum = z.nativeEnum(TreatmentStatus);
export const TreatmentItemStatusEnum = z.nativeEnum(TreatmentItemStatus);

// Minimal JSON helper
const JsonValueSchema = z.any();

// ---------- User ----------
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable().optional(),
  email: z.string().email(),
  role: UserRoleEnum.default('PATIENT'),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const UserCreateSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().email(),
  role: UserRoleEnum.optional(),
});
export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable().optional(),
  email: z.string().email().optional(),
  role: UserRoleEnum.optional(),
});
export type UserUpdate = z.infer<typeof UserUpdateSchema>;

// ---------- Question ----------
export const QuestionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  category: QuestionCategoryEnum,
  orderInSection: z.number().int(),
  possibleValues: JsonValueSchema, // typically number[]
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionCreateSchema = z.object({
  text: z.string(),
  category: QuestionCategoryEnum,
  orderInSection: z.number().int().nonnegative(),
  possibleValues: JsonValueSchema,
});
export type QuestionCreate = z.infer<typeof QuestionCreateSchema>;

export const QuestionUpdateSchema = z.object({
  id: z.string().uuid(),
  text: z.string().optional(),
  category: QuestionCategoryEnum.optional(),
  orderInSection: z.number().int().nonnegative().optional(),
  possibleValues: JsonValueSchema.optional(),
});
export type QuestionUpdate = z.infer<typeof QuestionUpdateSchema>;

// ---------- Submission ----------
export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.date(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export const SubmissionCreateSchema = z.object({
  userId: z.string().uuid(),
});
export type SubmissionCreate = z.infer<typeof SubmissionCreateSchema>;

export const SubmissionUpdateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().optional(),
});
export type SubmissionUpdate = z.infer<typeof SubmissionUpdateSchema>;

// ---------- SubmissionAnswer ----------
export const SubmissionAnswerSchema = z.object({
  id: z.string().uuid(),
  submissionId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.string(),
  createdAt: z.date(),
});
export type SubmissionAnswer = z.infer<typeof SubmissionAnswerSchema>;

export const SubmissionAnswerCreateSchema = z.object({
  submissionId: z.string().uuid(),
  questionId: z.string().uuid(),
  answer: z.string(),
});
export type SubmissionAnswerCreate = z.infer<typeof SubmissionAnswerCreateSchema>;

export const SubmissionAnswerUpdateSchema = z.object({
  id: z.string().uuid(),
  answer: z.string().optional(),
});
export type SubmissionAnswerUpdate = z.infer<typeof SubmissionAnswerUpdateSchema>;

// ---------- Treatment ----------
export const TreatmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  threadId: z.string().uuid().nullable().optional(),
  submissionId: z.string().uuid().nullable().optional(),
  source: z.string(),
  planJson: JsonValueSchema,
  status: TreatmentStatusEnum.default('PENDING'),
  createdAt: z.date(),
  reviewedBy: z.string().uuid().nullable().optional(),
});
export type Treatment = z.infer<typeof TreatmentSchema>;

export const TreatmentCreateSchema = z.object({
  userId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  submissionId: z.string().uuid().optional(),
  source: z.string(),
  planJson: JsonValueSchema,
  status: TreatmentStatusEnum.optional(),
  reviewedBy: z.string().uuid().optional(),
});
export type TreatmentCreate = z.infer<typeof TreatmentCreateSchema>;

export const TreatmentUpdateSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid().nullable().optional(),
  submissionId: z.string().uuid().nullable().optional(),
  source: z.string().optional(),
  planJson: JsonValueSchema.optional(),
  status: TreatmentStatusEnum.optional(),
  reviewedBy: z.string().uuid().nullable().optional(),
});
export type TreatmentUpdate = z.infer<typeof TreatmentUpdateSchema>;

// ---------- TreatmentItem ----------
export const TreatmentItemSchema = z.object({
  id: z.string().uuid(),
  treatmentId: z.string().uuid(),
  type: z.string(),
  name: z.string(),
  details: JsonValueSchema,
  status: TreatmentItemStatusEnum.default('PENDING'),
  reviewedBy: z.string().uuid().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type TreatmentItem = z.infer<typeof TreatmentItemSchema>;

export const TreatmentItemCreateSchema = z.object({
  treatmentId: z.string().uuid(),
  type: z.string(),
  name: z.string(),
  details: JsonValueSchema,
  status: TreatmentItemStatusEnum.optional(),
  reviewedBy: z.string().uuid().optional(),
  rejectionReason: z.string().optional(),
});
export type TreatmentItemCreate = z.infer<typeof TreatmentItemCreateSchema>;

export const TreatmentItemUpdateSchema = z.object({
  id: z.string().uuid(),
  type: z.string().optional(),
  name: z.string().optional(),
  details: JsonValueSchema.optional(),
  status: TreatmentItemStatusEnum.optional(),
  reviewedBy: z.string().uuid().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
});
export type TreatmentItemUpdate = z.infer<typeof TreatmentItemUpdateSchema>;

// ---------- Doctor ----------
export const DoctorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  createdAt: z.date(),
});
export type Doctor = z.infer<typeof DoctorSchema>;

export const DoctorCreateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});
export type DoctorCreate = z.infer<typeof DoctorCreateSchema>;

export const DoctorUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});
export type DoctorUpdate = z.infer<typeof DoctorUpdateSchema>;

// ---------- Assistant ----------
export const AssistantSchema = z.object({
  id: z.string().uuid(),
  openaiId: z.string(),
  name: z.string(),
  prompt: z.string(),
  filePaths: JsonValueSchema,
  createdAt: z.date(),
});
export type Assistant = z.infer<typeof AssistantSchema>;

export const AssistantCreateSchema = z.object({
  openaiId: z.string(),
  name: z.string(),
  prompt: z.string(),
  filePaths: JsonValueSchema,
});
export type AssistantCreate = z.infer<typeof AssistantCreateSchema>;

export const AssistantUpdateSchema = z.object({
  id: z.string().uuid(),
  openaiId: z.string().optional(),
  name: z.string().optional(),
  prompt: z.string().optional(),
  filePaths: JsonValueSchema.optional(),
});
export type AssistantUpdate = z.infer<typeof AssistantUpdateSchema>;

// ---------- Thread ----------
export const ThreadSchema = z.object({
  id: z.string().uuid(),
  openaiId: z.string(),
  assistantId: z.string().uuid(),
  userId: z.string().uuid(),
  submissionId: z.string().uuid().nullable().optional(),
  initialMessage: z.string().nullable().optional(),
  createdAt: z.date(),
});
export type Thread = z.infer<typeof ThreadSchema>;

export const ThreadCreateSchema = z.object({
  openaiId: z.string(),
  assistantId: z.string().uuid(),
  userId: z.string().uuid(),
  submissionId: z.string().uuid().optional(),
  initialMessage: z.string().optional(),
});
export type ThreadCreate = z.infer<typeof ThreadCreateSchema>;

export const ThreadUpdateSchema = z.object({
  id: z.string().uuid(),
  openaiId: z.string().optional(),
  assistantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  submissionId: z.string().uuid().nullable().optional(),
  initialMessage: z.string().nullable().optional(),
});
export type ThreadUpdate = z.infer<typeof ThreadUpdateSchema>;

// ---------- ThreadPrompt ----------
export const ThreadPromptSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  prompt: z.string(),
  type: ThreadPromptTypeEnum.default('TREATMENT'),
  isActive: z.boolean().default(false),
  config: JsonValueSchema.nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ThreadPrompt = z.infer<typeof ThreadPromptSchema>;

export const ThreadPromptCreateSchema = z.object({
  name: z.string(),
  prompt: z.string(),
  type: ThreadPromptTypeEnum.optional(),
  isActive: z.boolean().optional(),
  config: JsonValueSchema.optional(),
});
export type ThreadPromptCreate = z.infer<typeof ThreadPromptCreateSchema>;

export const ThreadPromptUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  prompt: z.string().optional(),
  type: ThreadPromptTypeEnum.optional(),
  isActive: z.boolean().optional(),
  config: JsonValueSchema.nullable().optional(),
});
export type ThreadPromptUpdate = z.infer<typeof ThreadPromptUpdateSchema>;

// ---------- Membership ----------
export const MembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tier: MembershipTierEnum,
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Membership = z.infer<typeof MembershipSchema>;

export const MembershipCreateSchema = z.object({
  userId: z.string().uuid(),
  tier: MembershipTierEnum,
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.string(),
});
export type MembershipCreate = z.infer<typeof MembershipCreateSchema>;

export const MembershipUpdateSchema = z.object({
  id: z.string().uuid(),
  tier: MembershipTierEnum.optional(),
  startDate: z.date().optional(),
  endDate: z.date().nullable().optional(),
  status: z.string().optional(),
});
export type MembershipUpdate = z.infer<typeof MembershipUpdateSchema>;

// ---------- KnowledgeFile ----------
export const KnowledgeFileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  title: z.string(),
  description: z.string(),
  bucketPath: z.string(),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nullable().optional(),
  isActive: z.boolean().default(true),
  openaiFileId: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type KnowledgeFile = z.infer<typeof KnowledgeFileSchema>;

export const KnowledgeFileCreateSchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  bucketPath: z.string(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().optional(),
  isActive: z.boolean().optional(),
  openaiFileId: z.string().optional(),
});
export type KnowledgeFileCreate = z.infer<typeof KnowledgeFileCreateSchema>;

export const KnowledgeFileUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  bucketPath: z.string().optional(),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
  openaiFileId: z.string().nullable().optional(),
});
export type KnowledgeFileUpdate = z.infer<typeof KnowledgeFileUpdateSchema>;

// Re-export a convenient namespace
export const Enums = {
  QuestionCategory: QuestionCategoryEnum,
  UserRole: UserRoleEnum,
  MembershipTier: MembershipTierEnum,
  ThreadPromptType: ThreadPromptTypeEnum,
  TreatmentStatus: TreatmentStatusEnum,
  TreatmentItemStatus: TreatmentItemStatusEnum,
};


