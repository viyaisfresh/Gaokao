import type { Subject, ErrorReason, VocabClassification, ClassicalTestType } from "@/types/schema";
import {
  SUBJECT_LABELS,
  SUBJECT_MAX,
  ERROR_REASON_LABELS,
  VOCAB_LABELS,
  CLASSICAL_TEST_LABELS,
} from "@/types/schema";

export {
  SUBJECT_LABELS,
  SUBJECT_MAX,
  ERROR_REASON_LABELS,
  VOCAB_LABELS,
  CLASSICAL_TEST_LABELS,
};

export const SUBJECTS: Subject[] = [
  "chinese",
  "math",
  "english",
  "physics",
  "chemistry",
  "biology",
];

export const ERROR_REASONS: ErrorReason[] = [
  "unknown",
  "confusion",
  "forgetting",
  "misread",
  "method_unfamiliar",
  "calculation",
  "time_short",
  "careless",
];

export const VOCAB_CLASSES: VocabClassification[] = ["N", "F", "S", "M", "C"];

export const CLASSICAL_TEST_TYPES: ClassicalTestType[] = [
  "recitation",
  "translation",
  "punctuation",
  "reading_comprehension",
];

export const BASELINE_SCORE = 358.77;
export const ARCHIVED_SCORE = 324; // 仅存档，不参与计算

export const GAOKAO_DATE = "2027-06-07";
