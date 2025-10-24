import { z } from 'zod';

export const PillarKeyEnum = z.enum([
  'nutrition',
  'movement_recovery',
  'mind_nervous_system',
  'environment_detox',
  'targeted_support',
  'testing_tracking',
]);

export const KnowledgeRefSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  filename: z.string(),
  note: z.string().optional(),
});

export const MetaInfoSchema = z.object({
  schemaVersion: z.literal('2.0.0'),
  planNumber: z.string().optional(),
  userId: z.string(),
  submissionId: z.string(),
  threadId: z.string(),
  treatmentId: z.string().optional(),
  createdAt: z.string(),
  model: z.string().optional(),
  openaiThreadId: z.string().optional(),
});

export const WorkingAssessmentSchema = z.object({
  summary: z.string().min(1),
  patterns: z.array(z.string()).optional(),
  interconnections: z.array(z.string()).optional(),
});

export const RootCauseSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  evidence: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  references: z.array(KnowledgeRefSchema).optional(),
});

export const PrioritySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['appointment', 'referral', 'diagnostic', 'action']),
  urgency: z.enum(['immediate', 'short_term', 'long_term']),
  rationale: z.string().optional(),
  owner: z.enum(['patient', 'doctor']).optional(),
  references: z.array(KnowledgeRefSchema).optional(),
});

const BaseRecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  frequency: z.string().optional(),
  schedule: z.string().optional(),
  durationWeeks: z.number().int().positive().optional(),
  dependencies: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional(),
  references: z.array(KnowledgeRefSchema).optional(),
});

export const NutritionRecommendationSchema = BaseRecommendationSchema.extend({
  type: z.literal('nutrition'),
  diets: z.array(z.string()).optional(),
  plateBuild: z.string().optional(),
  macros: z
    .object({
      protein_g_per_kg: z.number().positive().optional(),
      carb_pct: z.number().min(0).max(100).optional(),
      fat_pct: z.number().min(0).max(100).optional(),
    })
    .optional(),
  fiber_g_per_day: z.number().positive().optional(),
  phytonutrientTargets: z.array(z.string()).optional(),
  sampleMeals: z.array(z.string()).optional(),
  brandPicks: z.array(z.string()).optional(),
});

export const MovementRecoveryRecommendationSchema = BaseRecommendationSchema.extend({
  type: z.literal('movement_recovery'),
  stepsTarget: z.number().int().positive().optional(),
  strengthDaysPerWeek: z.number().int().min(0).max(7).optional(),
  zone2MinutesPerWeek: z.number().int().positive().optional(),
  sleepHygiene: z.array(z.string()).optional(),
});

export const MindNervousSystemRecommendationSchema = BaseRecommendationSchema.extend({
  type: z.literal('mind_nervous_system'),
  practices: z
    .array(
      z.object({
        name: z.string(),
        durationMin: z.number().int().positive().optional(),
        frequency: z.string().optional(),
      })
    )
    .optional(),
});

export const EnvironmentDetoxRecommendationSchema = BaseRecommendationSchema.extend({
  type: z.literal('environment_detox'),
  airPlan: z.array(z.string()).optional(),
  waterPlan: z.array(z.string()).optional(),
  sunVitaminD: z.array(z.string()).optional(),
  detoxPlan: z
    .object({
      bowelRegularity: z.string().optional(),
      binder: z.object({ name: z.string(), dose: z.string().optional(), timing: z.string().optional() }).optional(),
      sauna: z.object({ frequency: z.string().optional(), durationMin: z.number().int().positive().optional() }).optional(),
      cold: z.object({ frequency: z.string().optional(), durationSec: z.number().int().positive().optional() }).optional(),
      lymph: z.array(z.string()).optional(),
    })
    .optional(),
});

export const SupplementItemSchema = z.object({
  name: z.string(),
  form: z.string().optional(),
  dose: z.string(),
  frequency: z.string(),
  timing: z.string().optional(),
  cycle: z.string().optional(),
  startLowGoSlow: z.boolean().optional(),
  safetyBanners: z.array(z.string()).optional(),
  brands: z.array(z.string()).optional(),
});

export const TargetedStackSchema = z.object({
  id: z.string(),
  name: z.string(),
  goal: z.string(),
  items: z.array(SupplementItemSchema),
  references: z.array(KnowledgeRefSchema).optional(),
});

export const TargetedSupportRecommendationSchema = BaseRecommendationSchema.extend({
  type: z.literal('targeted_support'),
  stacks: z.array(TargetedStackSchema),
});

export const LabOrderSchema = z.object({
  name: z.string(),
  indication: z.string().optional(),
  specimen: z.enum(['blood', 'stool', 'urine', 'saliva', 'breath']).optional(),
  baseline: z.boolean().optional(),
  orderNow: z.boolean().optional(),
  orderAtWeeks: z.number().int().positive().optional(),
  targetRange: z.string().optional(),
  retestAtWeeks: z.number().int().positive().optional(),
});

export const WearableMetricSchema = z.object({
  device: z.enum(['oura', 'whoop', 'apple_watch', 'cgm', 'generic']).optional(),
  metric: z.string(),
  threshold: z.string().optional(),
  actionIfLow: z.string().optional(),
});

export const TestingTrackingRecommendationSchema = BaseRecommendationSchema.extend({
  type: z.literal('testing_tracking'),
  labs: z.array(LabOrderSchema).optional(),
  wearables: z.array(WearableMetricSchema).optional(),
});

export const PillarRecommendationSchema = z.discriminatedUnion('type', [
  NutritionRecommendationSchema,
  MovementRecoveryRecommendationSchema,
  MindNervousSystemRecommendationSchema,
  EnvironmentDetoxRecommendationSchema,
  TargetedSupportRecommendationSchema,
  TestingTrackingRecommendationSchema,
]);

export const PillarSchema = z.object({
  key: PillarKeyEnum,
  goals: z.array(z.string()).optional(),
  recommendations: z.array(PillarRecommendationSchema),
  references: z.array(KnowledgeRefSchema).optional(),
});

export const TreatmentPlanV2Schema = z.object({
  meta: MetaInfoSchema,
  workingAssessment: WorkingAssessmentSchema,
  likelyRootCauses: z.array(RootCauseSchema).min(1),
  priorities: z.array(PrioritySchema).min(0),
  pillars: z.record(PillarKeyEnum, PillarSchema),
  knowledgeFilesUsed: z.array(KnowledgeRefSchema).optional(),
});

export type TreatmentPlanV2 = z.infer<typeof TreatmentPlanV2Schema>;



