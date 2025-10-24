export type ISODate = string;

export enum PillarKey {
  Nutrition = 'nutrition',
  MovementRecovery = 'movement_recovery',
  MindNervousSystem = 'mind_nervous_system',
  EnvironmentDetox = 'environment_detox',
  TargetedSupport = 'targeted_support',
  TestingTracking = 'testing_tracking',
}

export interface KnowledgeRef {
  id?: string;
  title?: string;
  filename: string;
  note?: string;
}

export interface MetaInfo {
  schemaVersion: '2.0.0';
  planNumber?: string;
  userId: string;
  submissionId: string;
  threadId: string;
  treatmentId?: string;
  createdAt: ISODate;
  model?: string;
  openaiThreadId?: string;
}

export interface WorkingAssessment {
  summary: string;
  patterns?: string[];
  interconnections?: string[];
}

export interface RootCause {
  id: string;
  label: string;
  description: string;
  evidence: string[];
  confidence: number; // 0..1
  references?: KnowledgeRef[];
}

export interface Priority {
  id: string;
  title: string;
  type: 'appointment' | 'referral' | 'diagnostic' | 'action';
  urgency: 'immediate' | 'short_term' | 'long_term';
  rationale?: string;
  owner?: 'patient' | 'doctor';
  references?: KnowledgeRef[];
}

export interface BaseRecommendation {
  id: string;
  title: string;
  description?: string;
  frequency?: string;
  schedule?: string;
  durationWeeks?: number;
  dependencies?: string[];
  contraindications?: string[];
  references?: KnowledgeRef[];
}

export interface NutritionRecommendation extends BaseRecommendation {
  type: 'nutrition';
  diets?: string[];
  plateBuild?: string;
  macros?: { protein_g_per_kg?: number; carb_pct?: number; fat_pct?: number };
  fiber_g_per_day?: number;
  phytonutrientTargets?: string[];
  sampleMeals?: string[];
  brandPicks?: string[];
}

export interface MovementRecoveryRecommendation extends BaseRecommendation {
  type: 'movement_recovery';
  stepsTarget?: number;
  strengthDaysPerWeek?: number;
  zone2MinutesPerWeek?: number;
  sleepHygiene?: string[];
}

export interface MindNervousSystemRecommendation extends BaseRecommendation {
  type: 'mind_nervous_system';
  practices?: Array<{ name: string; durationMin?: number; frequency?: string }>;
}

export interface EnvironmentDetoxRecommendation extends BaseRecommendation {
  type: 'environment_detox';
  airPlan?: string[];
  waterPlan?: string[];
  sunVitaminD?: string[];
  detoxPlan?: {
    bowelRegularity?: string;
    binder?: { name: string; dose?: string; timing?: string };
    sauna?: { frequency?: string; durationMin?: number };
    cold?: { frequency?: string; durationSec?: number };
    lymph?: string[];
  };
}

export interface SupplementItem {
  name: string;
  form?: string;
  dose: string;
  frequency: string;
  timing?: string;
  cycle?: string;
  startLowGoSlow?: boolean;
  safetyBanners?: string[];
  brands?: string[];
}

export interface TargetedStack {
  id: string;
  name: string;
  goal: string;
  items: SupplementItem[];
  references?: KnowledgeRef[];
}

export interface TargetedSupportRecommendation extends BaseRecommendation {
  type: 'targeted_support';
  stacks: TargetedStack[];
}

export interface LabOrder {
  name: string;
  indication?: string;
  specimen?: 'blood' | 'stool' | 'urine' | 'saliva' | 'breath';
  baseline?: boolean;
  orderNow?: boolean;
  orderAtWeeks?: number;
  targetRange?: string;
  retestAtWeeks?: number;
}

export interface WearableMetric {
  device?: 'oura' | 'whoop' | 'apple_watch' | 'cgm' | 'generic';
  metric: string;
  threshold?: string;
  actionIfLow?: string;
}

export interface TestingTrackingRecommendation extends BaseRecommendation {
  type: 'testing_tracking';
  labs?: LabOrder[];
  wearables?: WearableMetric[];
}

export type PillarRecommendation =
  | NutritionRecommendation
  | MovementRecoveryRecommendation
  | MindNervousSystemRecommendation
  | EnvironmentDetoxRecommendation
  | TargetedSupportRecommendation
  | TestingTrackingRecommendation;

export interface Pillar {
  key: PillarKey;
  goals?: string[];
  recommendations: PillarRecommendation[];
  references?: KnowledgeRef[];
}

export interface TreatmentPlanV2 {
  meta: MetaInfo;
  workingAssessment: WorkingAssessment;
  likelyRootCauses: RootCause[];
  priorities: Priority[];
  pillars: Record<PillarKey, Pillar>;
  knowledgeFilesUsed?: KnowledgeRef[];
}



