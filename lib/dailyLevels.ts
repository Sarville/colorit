import type {Level} from "@/lib/gameEngine";
import {DailyPool, DAILY_POOL_VERSION, type PoolEntry} from "@/levels/DailyPool";
import {dailyScoreForSlot, type ScoredPack} from "@/lib/scoring";
import {loadProgress, saveProgress} from "@/lib/cloudSave";

const SLOT_COUNT = 5;
const DAILY_KEY = "dailyLevels";

export type DailyDayEntry = {
  date: string;
  poolIndices: [number, number, number, number, number];
  best: Array<number | null>;
  // Points already banked per slot - computed and locked in at the moment each slot is first
  // completed (or improved), using whether *that day* was still current *at that moment*. Storing
  // the result (not the raw ingredients) means a later calendar day never silently changes what an
  // on-time clear already earned - see lib/scoring.ts's dailyScoreForSlot.
  scored: Array<number>;
};

export type DailyHistoryData = {
  days: Array<DailyDayEntry>;
  // Which build of levels/DailyPool.ts these poolIndices were drawn against - a rebuild can
  // reorder/replace entries, so an index saved under an older version may now point at a
  // different (or out-of-range) level. See ensureTodayEntry() and flattenDailyHistory().
  poolVersion?: string;
};

export type DailyTile = {
  date: string;
  slotIndex: number;
  poolIndex: number;
  level: Level;
  optimal: number;
  difficulty: ScoredPack;
  best: number | null;
  isCurrentDay: boolean;
};

// Local calendar day, not UTC - "resets at midnight in the user's own timezone" per spec.
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function poolIndicesByDifficulty(difficulty: ScoredPack): Array<number> {
  const indices: Array<number> = [];
  DailyPool.forEach((entry, i) => { if (entry.difficulty === difficulty) indices.push(i); });
  return indices;
}

function pick(indices: Array<number>): number {
  return indices[Math.floor(Math.random() * indices.length)];
}

// One of each difficulty plus 2 fully random ones, drawn from the shared 300-level pool (see
// levels/DailyPool.ts) - not generated per-user, so every player's daily set is a random sample
// of the same pre-built, pre-verified pool.
function pickUnique(candidates: Array<number>, exclude: Array<number>): number {
  const options = candidates.filter((i) => !exclude.includes(i));
  // Pool is large enough per difficulty that this shouldn't happen in practice; falling back to
  // a possible repeat is still better than throwing.
  return options.length > 0 ? pick(options) : pick(candidates);
}

function pickPoolIndices(): [number, number, number, number, number] {
  const all = DailyPool.map((_, i) => i);
  const chosen: Array<number> = [
    pickUnique(poolIndicesByDifficulty("Easy"), []),
    pickUnique(poolIndicesByDifficulty("Medium"), []),
    pickUnique(poolIndicesByDifficulty("Hard"), []),
  ];
  while (chosen.length < SLOT_COUNT) {
    chosen.push(pickUnique(all, chosen));
  }
  return chosen as [number, number, number, number, number];
}

export async function peekDailyHistory(): Promise<DailyHistoryData> {
  const stored = await loadProgress<DailyHistoryData>(DAILY_KEY);
  return stored && Array.isArray(stored.days) ? stored : {days: []};
}

function freshEntry(date: string): DailyDayEntry {
  return {
    date,
    poolIndices: pickPoolIndices(),
    best: new Array(SLOT_COUNT).fill(null),
    scored: new Array(SLOT_COUNT).fill(0),
  };
}

// Called only when actually entering Daily mode: ensures today's 5 levels exist, drawing (and
// persisting) a fresh set from the pool the first time this is called on a given local day. Past
// days' entries are never touched or removed - that's the "don't take away levels the user
// already saw" requirement.
//
// If the pool has been rebuilt since today's entry was drawn (poolVersion mismatch), today's
// picks are redrawn fresh against the current pool instead of being left to reference whatever
// (possibly nonsensical, possibly out-of-range) levels their old indices now happen to land on -
// safe to do because "today" is the only day that can still be un-started/un-scored; past days
// are left as-is (see flattenDailyHistory's bounds check for how those are kept safe to render).
export async function ensureTodayEntry(): Promise<DailyHistoryData> {
  const history = await peekDailyHistory();
  const today = todayKey();
  const stale = history.poolVersion !== DAILY_POOL_VERSION;
  const existingIndex = history.days.findIndex((d) => d.date === today);

  if (existingIndex !== -1 && !stale) {
    return history;
  }

  const days = existingIndex !== -1
    ? history.days.map((d, i) => (i === existingIndex ? freshEntry(today) : d))
    : [...history.days, freshEntry(today)];

  const next: DailyHistoryData = {days, poolVersion: DAILY_POOL_VERSION};
  await saveProgress(next, DAILY_KEY);
  return next;
}

export async function saveDailyHistory(history: DailyHistoryData): Promise<void> {
  await saveProgress(history, DAILY_KEY);
}

export async function clearDailyHistory(): Promise<void> {
  await saveProgress(null, DAILY_KEY);
}

function poolEntry(index: number): PoolEntry | undefined {
  return DailyPool[index];
}

// Newest day first, so today's 5 (the ones worth full credit) are always at the top of the list.
// A past day's poolIndex can end up out of range after the pool shrinks in a rebuild (see
// ensureTodayEntry's comment) - such a slot is skipped here rather than crashing the picker; its
// already-banked score (lib/dailyLevels.ts's `scored`, summed directly in totalDailyScore) isn't
// affected, only its tile stops rendering.
// Within one day's 5, easiest (fewest optimal moves) first - `slotIndex` (not array position)
// is what scoring/best-tracking actually key off (see recordDailyBest), so reordering here is
// purely a display/navigation concern and never touches which slot a completion is recorded
// against.
export function flattenDailyHistory(history: DailyHistoryData): Array<DailyTile> {
  const today = todayKey();
  const tiles: Array<DailyTile> = [];
  [...history.days].reverse().forEach((day) => {
    const dayTiles: Array<DailyTile> = [];
    day.poolIndices.forEach((poolIndex, slotIndex) => {
      const entry = poolEntry(poolIndex);
      if (!entry) {
        return;
      }
      dayTiles.push({
        date: day.date,
        slotIndex,
        poolIndex,
        level: entry.level,
        optimal: entry.optimal,
        difficulty: entry.difficulty,
        best: day.best[slotIndex],
        isCurrentDay: day.date === today,
      });
    });
    dayTiles.sort((a, b) => a.optimal - b.optimal);
    tiles.push(...dayTiles);
  });
  return tiles;
}

// Records a new best for one slot (only called when it's actually an improvement) and banks the
// points it earns - full (with the perfect-clear bonus, if earned) while that slot's day is still
// today, minimum-only once it isn't. See the `scored` field comment above for why the result is
// stored rather than left to be recomputed from `best` later.
export function recordDailyBest(history: DailyHistoryData, date: string, slotIndex: number, moves: number): DailyHistoryData {
  const today = todayKey();
  const days = history.days.map((day) => {
    if (day.date !== date) {
      return day;
    }
    const entry = poolEntry(day.poolIndices[slotIndex]);
    if (!entry) {
      // Can't happen via normal play (flattenDailyHistory never renders a tile for an
      // out-of-range slot, so there's nothing to click into) - guards the type only.
      return day;
    }
    const best = [...day.best];
    const scored = [...day.scored];
    best[slotIndex] = moves;
    scored[slotIndex] = dailyScoreForSlot(entry.difficulty, entry.optimal, moves, day.date === today);
    return {...day, best, scored};
  });
  return {days};
}

export function totalDailyScore(history: DailyHistoryData | null): number {
  if (!history) {
    return 0;
  }
  return history.days.reduce((sum, day) => sum + day.scored.reduce((s, v) => s + v, 0), 0);
}
