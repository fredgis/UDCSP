// Loads A15 JSONL synthetic personas from data/synthetic/personas/{dk,se,no}-personas.jsonl.
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
export type Persona = { id: string; name: string; country: 'DK' | 'SE' | 'NO'; locale: string; scenarioIds?: string[] };
export function findPersona(pred: (p: Persona) => boolean): Persona {
  const rows = (['DK', 'SE', 'NO'] as const).flatMap((c) => {
    const p = join(process.cwd(), '..', '..', 'data', 'synthetic', 'personas', `${c.toLowerCase()}-personas.jsonl`);
    if (!existsSync(p)) return [] as Persona[];
    return readFileSync(p, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const r = JSON.parse(line);
        return {
          id: r.id,
          name: r.name,
          country: r.country as 'DK' | 'SE' | 'NO',
          locale: r.languages?.[0] ?? 'en',
          scenarioIds: r.scenarioIds,
        } as Persona;
      });
  });
  return rows.find(pred) ?? { id: 'scaffold-persona', name: 'Synthetic Persona', country: 'DK', locale: 'en' };
}