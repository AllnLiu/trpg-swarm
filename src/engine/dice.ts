import type { DiceRollResult } from './types.ts';

/**
 * Deterministic Mulberry32 PRNG for reproducible TRPG combat simulations & testing.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seed?: number) {
    if (seed !== undefined && Number.isFinite(seed)) {
      this.state = seed >>> 0;
    } else {
      this.state = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    }
  }

  public getSeed(): number {
    return this.state >>> 0;
  }

  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }
}

let globalRng = new DeterministicRNG();

export function setGlobalDiceSeed(seed: number): void {
  globalRng = new DeterministicRNG(seed);
}

export function getGlobalRng(): DeterministicRNG {
  return globalRng;
}

/**
 * Parses and rolls standard & complex TRPG dice expressions:
 * - "1d20+5"
 * - "2d20kh1+6" (Advantage / keep highest 1)
 * - "2d20kl1+6" (Disadvantage / keep lowest 1)
 * - "4d6dl1" (Drop lowest 1 for character creation)
 * - "4d6dh1" (Drop highest 1)
 * - "8d6" (Fireball)
 * - "1d100" (CoC percentile)
 * - "2d6+2" (PbtA move)
 * - Multi-term expressions like "2d6+1d4+3"
 */
export function rollDice(
  expression: string,
  seedOrRng?: number | DeterministicRNG
): DiceRollResult {
  const rng =
    seedOrRng instanceof DeterministicRNG
      ? seedOrRng
      : seedOrRng !== undefined
        ? new DeterministicRNG(seedOrRng)
        : globalRng;

  const seedUsed = rng.getSeed();
  const cleanExpr = expression.replace(/\s+/g, '').toLowerCase();

  // Match terms like +2d20kh1, -1d6, +5, etc.
  const termRegex = /([+-]?)(\d+d\d+(?:(?:kh|kl|dh|dl)\d+)?|\d+)/g;
  let match: RegExpExecArray | null;

  const allRawRolls: number[] = [];
  const allKeptRolls: number[] = [];
  const allDroppedRolls: number[] = [];
  let totalModifier = 0;
  let diceTotal = 0;

  let primaryDieSides = 0;
  let primaryKeptValue = 0;
  let hasPrimaryDie = false;

  const termDetails: string[] = [];

  while ((match = termRegex.exec(cleanExpr)) !== null) {
    if (match[0] === '') continue;
    const sign = match[1] === '-' ? -1 : 1;
    const body = match[2];

    if (body.includes('d')) {
      const diceMatch = /^(\d+)d(\d+)(?:(kh|kl|dh|dl)(\d+))?$/.exec(body);
      if (!diceMatch) {
        throw new Error(`Invalid dice term "${body}" in expression "${expression}"`);
      }

      const count = parseInt(diceMatch[1], 10);
      const sides = parseInt(diceMatch[2], 10);
      const keepDropMode = diceMatch[3] as 'kh' | 'kl' | 'dh' | 'dl' | undefined;
      const keepDropCount = diceMatch[4] ? parseInt(diceMatch[4], 10) : count;

      if (count <= 0 || count > 200 || sides <= 0 || sides > 10000) {
        throw new Error(`Dice parameters out of bounds in "${body}"`);
      }

      const rolls: { val: number; idx: number }[] = [];
      for (let i = 0; i < count; i++) {
        const val = rng.nextInt(1, sides);
        rolls.push({ val, idx: i });
        allRawRolls.push(val);
      }

      let keptIndices = new Set<number>(rolls.map((r) => r.idx));

      if (keepDropMode) {
        const sorted = [...rolls].sort((a, b) => a.val - b.val);
        keptIndices.clear();

        if (keepDropMode === 'kh') {
          const toKeep = sorted.slice(Math.max(0, sorted.length - keepDropCount));
          for (const item of toKeep) keptIndices.add(item.idx);
        } else if (keepDropMode === 'kl') {
          const toKeep = sorted.slice(0, Math.min(sorted.length, keepDropCount));
          for (const item of toKeep) keptIndices.add(item.idx);
        } else if (keepDropMode === 'dl') {
          const toKeep = sorted.slice(Math.min(sorted.length, keepDropCount));
          for (const item of toKeep) keptIndices.add(item.idx);
        } else if (keepDropMode === 'dh') {
          const toKeep = sorted.slice(0, Math.max(0, sorted.length - keepDropCount));
          for (const item of toKeep) keptIndices.add(item.idx);
        }
      }

      const termKept: number[] = [];
      const termDropped: number[] = [];
      for (const r of rolls) {
        if (keptIndices.has(r.idx)) {
          termKept.push(r.val);
          allKeptRolls.push(r.val);
        } else {
          termDropped.push(r.val);
          allDroppedRolls.push(r.val);
        }
      }

      const termSum = termKept.reduce((acc, v) => acc + v, 0) * sign;
      diceTotal += termSum;

      if (!hasPrimaryDie) {
        hasPrimaryDie = true;
        primaryDieSides = sides;
        primaryKeptValue = termKept.length > 0 ? termKept[0] : 0;
      }

      const fmtRolls = rolls
        .map((r) => (keptIndices.has(r.idx) ? `${r.val}` : `~${r.val}~`))
        .join(', ');
      termDetails.push(`${sign < 0 ? '-' : ''}${body}[${fmtRolls}]`);
    } else {
      const modVal = parseInt(body, 10) * sign;
      totalModifier += modVal;
      termDetails.push(`${modVal >= 0 ? '+' + modVal : modVal}`);
    }
  }

  const total = diceTotal + totalModifier;

  let isCriticalSuccess = false;
  let isCriticalFailure = false;

  if (hasPrimaryDie) {
    if (primaryDieSides === 20) {
      isCriticalSuccess = primaryKeptValue === 20;
      isCriticalFailure = primaryKeptValue === 1;
    } else if (primaryDieSides === 100) {
      isCriticalSuccess = primaryKeptValue === 1;
      isCriticalFailure = primaryKeptValue >= 96;
    } else if (primaryDieSides === 6 && allRawRolls.length === 2 && allKeptRolls.length === 2) {
      // 2d6 PbtA boxcars (12) or snake eyes (2)
      const sum2d6 = allKeptRolls[0] + allKeptRolls[1];
      isCriticalSuccess = sum2d6 === 12;
      isCriticalFailure = sum2d6 === 2;
    }
  }

  return {
    expression: cleanExpr,
    rawRolls: allRawRolls,
    keptRolls: allKeptRolls,
    droppedRolls: allDroppedRolls,
    modifier: totalModifier,
    total,
    isCriticalSuccess,
    isCriticalFailure,
    seedUsed,
    details: `${cleanExpr} => ${termDetails.join(' ')} = ${total}`,
  };
}

/**
 * Call of Cthulhu 7e 1d100 roll with Bonus (+1, +2) or Penalty (-1, -2) tens dice.
 * @param skill The investigator's target skill/characteristic threshold (1-100)
 * @param bonusPenaltyDice Positive for Bonus Dice, Negative for Penalty Dice, 0 for normal
 * @param seedOrRng Optional deterministic seed or RNG instance
 */
export function rollCoCD100(
  skill: number,
  bonusPenaltyDice = 0,
  seedOrRng?: number | DeterministicRNG
): DiceRollResult & {
  unitsDie: number;
  tensDice: number[];
  skillThreshold: number;
} {
  const rng =
    seedOrRng instanceof DeterministicRNG
      ? seedOrRng
      : seedOrRng !== undefined
        ? new DeterministicRNG(seedOrRng)
        : globalRng;

  const seedUsed = rng.getSeed();
  const unitsDie = rng.nextInt(0, 9);
  const extraTensCount = Math.min(2, Math.abs(Math.trunc(bonusPenaltyDice)));
  const tensDice: number[] = [];

  for (let i = 0; i < 1 + extraTensCount; i++) {
    tensDice.push(rng.nextInt(0, 9));
  }

  const candidateTotals = tensDice.map((tens) => {
    const val = tens * 10 + unitsDie;
    return val === 0 ? 100 : val;
  });

  let chosenTotal: number;
  if (bonusPenaltyDice > 0) {
    chosenTotal = Math.min(...candidateTotals);
  } else if (bonusPenaltyDice < 0) {
    chosenTotal = Math.max(...candidateTotals);
  } else {
    chosenTotal = candidateTotals[0];
  }

  const droppedRolls = candidateTotals.filter((v, idx) => {
    const chosenIdx = candidateTotals.indexOf(chosenTotal);
    return idx !== chosenIdx;
  });

  const isCriticalSuccess = chosenTotal === 1;
  const isCriticalFailure = skill < 50 ? chosenTotal >= 96 : chosenTotal === 100;

  const modeLabel =
    bonusPenaltyDice > 0
      ? `1d100+${extraTensCount}B`
      : bonusPenaltyDice < 0
        ? `1d100+${extraTensCount}P`
        : '1d100';

  return {
    expression: modeLabel,
    rawRolls: candidateTotals,
    keptRolls: [chosenTotal],
    droppedRolls,
    modifier: 0,
    total: chosenTotal,
    isCriticalSuccess,
    isCriticalFailure,
    seedUsed,
    unitsDie,
    tensDice,
    skillThreshold: skill,
    details: `${modeLabel} (units=${unitsDie}, tens=[${tensDice.join(',')}]) => candidates=[${candidateTotals.join(', ')}] => ${chosenTotal} (vs Skill ${skill})`,
  };
}

/**
 * Computes expected average value of a standard damage/heal dice formula (e.g. "2d6+3" -> 10, "8d6" -> 28)
 * Used by the dynamic situational awareness Tactical AI.
 */
export function estimateDiceExpectedValue(formula?: string): number {
  if (!formula) return 0;
  const clean = formula.replace(/\s+/g, '').toLowerCase();
  const termRegex = /([+-]?)(\d+d\d+|\d+)/g;
  let match: RegExpExecArray | null;
  let expected = 0;

  while ((match = termRegex.exec(clean)) !== null) {
    if (match[0] === '') continue;
    const sign = match[1] === '-' ? -1 : 1;
    const body = match[2];
    if (body.includes('d')) {
      const [cStr, sStr] = body.split('d');
      const count = parseInt(cStr, 10) || 1;
      const sides = parseInt(sStr, 10) || 6;
      expected += sign * count * ((sides + 1) / 2);
    } else {
      expected += sign * (parseInt(body, 10) || 0);
    }
  }
  return Math.max(0, expected);
}
