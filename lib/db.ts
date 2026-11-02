"use client";

import Dexie, { Table } from "dexie";
import type {
  Exam,
  WrongItem,
  ReviewTask,
  VocabTest,
  ClassicalRecord,
  ScoreForecast,
  RewardLedger,
  DailyAction,
} from "@/types/schema";

export class GaokaoDB extends Dexie {
  exams!: Table<Exam, string>;
  wrongItems!: Table<WrongItem, string>;
  reviewTasks!: Table<ReviewTask, string>;
  vocabTests!: Table<VocabTest, string>;
  classicalRecords!: Table<ClassicalRecord, string>;
  forecasts!: Table<ScoreForecast, string>;
  rewards!: Table<RewardLedger, string>;
  dailyActions!: Table<DailyAction, string>;

  constructor() {
    super("gaokao-coach-2027");
    this.version(1).stores({
      exams: "id, date, isBaseline, isArchived",
      wrongItems: "id, date, subject, status, examId",
      reviewTasks: "id, scheduledDate, sourceType, sourceId, completedDate",
      vocabTests: "id, date, wordList",
      classicalRecords: "id, date, pieceId, testType",
      forecasts: "id, date, version",
      rewards: "id, date",
      dailyActions: "id, date, completed",
    });
  }
}

let _db: GaokaoDB | null = null;

export function getDB(): GaokaoDB {
  if (typeof window === "undefined") {
    throw new Error("DB only available in browser");
  }
  if (!_db) {
    _db = new GaokaoDB();
  }
  return _db;
}

export function genId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
