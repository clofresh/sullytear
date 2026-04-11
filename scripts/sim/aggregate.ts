export interface AggregatedMetrics {
  runs: number;
  wins: number;
  winRate: number;
  avgEncountersCleared: number;
  avgTurns: number;
  damageBySource: Record<string, number>; // fractions of total
  healBySource: Record<string, number>;   // raw totals
}

export function aggregateRecords(jsonLines: string[]): AggregatedMetrics {
  const records = jsonLines.map((l) => JSON.parse(l));
  const wins = records.filter((r: any) => r.result === 'victory').length;
  const avgEnc = records.reduce((s: number, r: any) => s + r.encountersCleared, 0) / records.length;
  const avgTurns = records.reduce((s: number, r: any) => s + r.turns, 0) / records.length;

  const rawDamage: Record<string, number> = {};
  const rawHeal: Record<string, number> = {};
  for (const r of records) {
    for (const [k, v] of Object.entries((r as any).damageBySource)) {
      rawDamage[k] = (rawDamage[k] ?? 0) + (v as number);
    }
    for (const [k, v] of Object.entries((r as any).healBySource)) {
      rawHeal[k] = (rawHeal[k] ?? 0) + (v as number);
    }
  }
  const totalDamage = Object.values(rawDamage).reduce((a, b) => a + b, 0);
  const damageFractions: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawDamage)) {
    damageFractions[k] = totalDamage > 0 ? v / totalDamage : 0;
  }

  return {
    runs: records.length,
    wins,
    winRate: wins / records.length,
    avgEncountersCleared: avgEnc,
    avgTurns,
    damageBySource: damageFractions,
    healBySource: rawHeal,
  };
}
