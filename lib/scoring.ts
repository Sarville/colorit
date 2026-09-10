import {EasyLevels, EasyOptimal} from "@/levels/Easy";
import {MediumLevels, MediumOptimal} from "@/levels/Medium";
import {HardLevels, HardOptimal} from "@/levels/Hard";
import {levelProgressProps} from "@/levels/levelsUtils";

export type ScoredPack = "Easy" | "Medium" | "Hard";

const GROUP_SIZE = 5;

const packLevels: Record<ScoredPack, Array<unknown>> = {Easy: EasyLevels, Medium: MediumLevels, Hard: HardLevels};
const packOptimal: Record<ScoredPack, Array<number | null>> = {Easy: EasyOptimal, Medium: MediumOptimal, Hard: HardOptimal};

// Groups of 5 levels are numbered continuously across Easy -> Medium -> Hard (not restarting at
// 1 for each pack), so a formula driven purely by this number automatically makes every reward in
// Medium's first group outscore every reward in Easy's last group, and likewise Hard vs Medium -
// exactly the "harder pack scores more" requirement, with no per-pack special-casing.
const groupsBeforePack: Record<ScoredPack, number> = {
  Easy: 0,
  Medium: Math.ceil(EasyLevels.length / GROUP_SIZE),
  Hard: Math.ceil(EasyLevels.length / GROUP_SIZE) + Math.ceil(MediumLevels.length / GROUP_SIZE),
};

// 1-indexed global group number for a level.
function globalGroup(pack: ScoredPack, levelIndex: number): number {
  return groupsBeforePack[pack] + Math.floor(levelIndex / GROUP_SIZE) + 1;
}

// Base clear reward: 5 per group (5, 10, 15, ... for Easy's groups 1, 2, 3, ...), continuing
// across packs via the global group number above.
function baseScore(group: number): number {
  return 5 * group;
}

// Perfect-clear (minimum moves) bonus: 5, 6, 8, 11, 15, ... i.e. 5 plus the triangular number of
// (group - 1) - matches the "5 for group 1, 6 for group 2, 8 for group 3" example exactly.
function bonusScore(group: number): number {
  return 5 + ((group - 1) * group) / 2;
}

// Slow-clear penalty tier: 0 below 1.5x optimal moves (no penalty), 1 at [1.5x, 2x), 2 at
// [2x, 2.5x), etc.
function slowTier(movesRatio: number): number {
  return Math.max(0, Math.floor((movesRatio - 1) / 0.5));
}

// Penalty amount: group 1's tier 1 = 1, tier 2 = 2 ("1.5x -1 balls, 2x -2 balls"); group 2's
// tier 1 = 2, tier 2 = 3 ("the second five: 1.5x -2, 2x -3") - i.e. tier + (group - 1).
function penaltyScore(group: number, tier: number): number {
  return group + tier - 1;
}

// Score for one already-completed level (best === null means not completed -> 0). Completing a
// level always scores at least 1 point, however slowly.
export function scoreForLevel(pack: ScoredPack, levelIndex: number, best: number | null, optimal: number | null): number {
  if (best === null) {
    return 0;
  }
  const group = globalGroup(pack, levelIndex);
  const base = baseScore(group);
  if (optimal === null) {
    return base;
  }
  if (best === optimal) {
    return base + bonusScore(group);
  }
  const tier = slowTier(best / optimal);
  if (tier < 1) {
    return base;
  }
  return Math.max(1, base - penaltyScore(group, tier));
}

export function totalPackScore(progress: Record<ScoredPack, Array<levelProgressProps>>): number {
  let total = 0;
  (Object.keys(packLevels) as Array<ScoredPack>).forEach((pack) => {
    progress[pack].forEach((entry, levelIndex) => {
      total += scoreForLevel(pack, levelIndex, entry.best, packOptimal[pack][levelIndex]);
    });
  });
  return total;
}

// Flat per-difficulty rate for daily levels (position-independent - a daily level has no
// "position in a pack" to run the group progression off) - doubled on a minimal-moves clear,
// per the "double points for perfect daily clears" requirement. isCurrentDay gates the bonus
// entirely (and is evaluated once, at the moment of that particular clear, then the result is
// stored - see lib/dailyLevels.ts's changeDailyBest - not re-derived later): solving a level from
// a past day's set (still visible/playable, just no longer "today's" 5) always pays only the flat
// base rate, however good the moves were.
export const DAILY_BASE_SCORE: Record<ScoredPack, number> = {Easy: 5, Medium: 10, Hard: 15};

export function dailyScoreForSlot(pack: ScoredPack, optimal: number, best: number | null, isCurrentDay: boolean): number {
  if (best === null) {
    return 0;
  }
  const base = DAILY_BASE_SCORE[pack];
  return isCurrentDay && best === optimal ? base * 2 : base;
}
