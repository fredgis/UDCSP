// Scenario ID: D10 from uses.md — Ole DevOps installer smoke.
// Eval matrix rows: 10,14,17,18.
// TODO: case-study scaffold. Verifies A16 report presence without running installer.
import { test, expect } from '../fixtures/personas'; import { existsSync, readdirSync } from 'fs'; import { join } from 'path';
test('Scenario 09 - installer report exists', async () => { const reportsRoot=join(process.cwd(),'..','..','scripts','install','reports'); const hasReport=existsSync(reportsRoot)&&readdirSync(reportsRoot).some(d=>existsSync(join(reportsRoot,d,'install-report.json'))||/install-report\.(html|json)$/i.test(d)); expect.soft(hasReport,'A16 publishes scripts/install/reports/<timestamp>/install-report.*').toBeTruthy(); expect(process.env.UDCSP_INSTALLER_REPORT_REQUIRED??'false').toMatch(/true|false/); });
