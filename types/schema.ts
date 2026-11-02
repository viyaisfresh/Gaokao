// 类型定义 — 与 Dexie schema 一一对应

export type Subject =
  | "chinese"
  | "math"
  | "english"
  | "physics"
  | "chemistry"
  | "biology";

export type ScoreType = "raw" | "ranked";
export type Comparability = "comparable" | "incomparable";

export const SUBJECT_LABELS: Record<Subject, string> = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
};

export const SUBJECT_MAX: Record<Subject, number> = {
  chinese: 150,
  math: 150,
  english: 150,
  physics: 100,
  chemistry: 100,
  biology: 100,
};

export interface SubjectScore {
  subject: Subject;
  rawScore: number;
  rankedScore?: number;
  scoreType: ScoreType;
  comparability: Comparability;
}

export interface Exam {
  id: string;
  date: string;
  examType: string;
  isBaseline: boolean;
  isArchived: boolean;
  totalScore: number;
  totalScoreType: ScoreType;
  subjectScores: SubjectScore[];
  notes?: string;
}

export type ErrorReason =
  | "unknown"
  | "confusion"
  | "forgetting"
  | "misread"
  | "method_unfamiliar"
  | "calculation"
  | "time_short"
  | "careless";

export const ERROR_REASON_LABELS: Record<ErrorReason, string> = {
  unknown: "知识不会",
  confusion: "概念混淆",
  forgetting: "记忆遗忘",
  misread: "审题错误",
  method_unfamiliar: "解题方法不熟",
  calculation: "计算错误",
  time_short: "时间不足",
  careless: "粗心",
};

export type ReviewAttempt = "first_pass" | "after_hint" | "after_key_step";

export interface ReviewResult {
  date: string;
  attempt: ReviewAttempt;
  passed: boolean;
}

export interface WrongItem {
  id: string;
  examId?: string;
  date: string;
  subject: Subject;
  knowledgePoint: string;
  questionType: string;
  errorReason: ErrorReason;
  hintCount: number;
  solvedIndependently: boolean;
  reviewResults: ReviewResult[];
  transferredToNewQuestion: boolean | null;
  status: "open" | "mastered" | "archived";
}

export type ReviewSourceType = "wrong_item" | "vocab" | "classical";

export interface ReviewTask {
  id: string;
  sourceType: ReviewSourceType;
  sourceId: string;
  scheduledDate: string;
  interval: 1 | 3 | 7;
  completedDate?: string;
  result?: "pass" | "fail" | "partial";
  notes?: string;
}

export type VocabClassification = "N" | "F" | "S" | "M" | "C";

export const VOCAB_LABELS: Record<VocabClassification, string> = {
  N: "未接触",
  F: "见过遗忘",
  S: "拼写错误",
  M: "词义错误",
  C: "完全正确",
};

export interface VocabResult {
  word: string;
  classification: VocabClassification;
  meaningProvided?: string;
}

export interface VocabTest {
  id: string;
  date: string;
  testType: "en_to_zh" | "zh_to_en";
  wordList: string;
  results: VocabResult[];
}

export type ClassicalTestType =
  | "recitation"
  | "translation"
  | "punctuation"
  | "reading_comprehension";

export const CLASSICAL_TEST_LABELS: Record<ClassicalTestType, string> = {
  recitation: "默写",
  translation: "翻译",
  punctuation: "断句",
  reading_comprehension: "阅读理解",
};

export interface ClassicalRecord {
  id: string;
  date: string;
  pieceId: string;
  testType: ClassicalTestType;
  errors: string[];
  correctBefore: boolean;
  schoolListVerified: boolean;
}

export interface ForecastInterval {
  range: string;
  probability: number;
}

export interface ForecastScenarios {
  conservative: [number, number];
  normal: [number, number];
  efficient: [number, number];
  breakout: [number, number];
}

export interface ScoreForecast {
  id: string;
  date: string;
  version: string;
  sampleSize: number;
  confidenceLevel: "low" | "medium" | "high";
  intervals: ForecastInterval[];
  scenarios: ForecastScenarios;
  notes: string;
}

export interface RewardLedger {
  id: string;
  date: string;
  action: string;
  scoreBreakdown: {
    execution?: number;
    learningEffect?: number;
    progress?: number;
  };
  cashReward?: number;
  notes?: string;
}

export interface DailyAction {
  id: string;
  date: string;
  title: string;
  description: string;
  completed: boolean;
  completedDate?: string;
}
