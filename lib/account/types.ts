import type { JournalEntry, SavedPrayer } from "../journal";

export interface ProgressData {
  completed: Record<string, boolean>;
  answers: Record<string, string[]>;
  level: "beginner" | "intermediate" | "indepth";
}

export interface DeletedRecord {
  id: string;
  deletedAt: string;
}

export interface AccountSnapshot {
  version: 1;
  entries: JournalEntry[];
  prayers: SavedPrayer[];
  progress: ProgressData;
  progressUpdatedAt: string | null;
  progressVersions: Record<string, string>;
  deletedEntries: DeletedRecord[];
  deletedPrayers: DeletedRecord[];
}

export interface AccountDataResponse {
  revision: number;
  data: AccountSnapshot;
}

export const EMPTY_ACCOUNT_SNAPSHOT: AccountSnapshot = {
  version: 1,
  entries: [],
  prayers: [],
  progress: { completed: {}, answers: {}, level: "beginner" },
  progressUpdatedAt: null,
  progressVersions: {},
  deletedEntries: [],
  deletedPrayers: [],
};
