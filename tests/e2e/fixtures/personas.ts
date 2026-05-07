// TODO: case-study scaffold. Fixture loads personas from A15 synthetic JSONL.
import { test as base } from '@playwright/test'; import { findPersona, Persona } from '../helpers/synthetic-data';
export const test=base.extend<{persona:Persona}>({ persona: async ({},use,testInfo)=>{ const m=testInfo.title.match(/Scenario (\d+)/); await use(findPersona(p=>p.scenarioIds?.includes(`D${Number(m?.[1]??0)}`)??false)); } });
export { expect } from '@playwright/test';
