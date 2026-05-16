// Loads the IVR dialog YAMLs and the recording-disclosure script for the
// active country. The YAMLs in apps/voice/ivr/{lang}/*.yaml are the design
// source for the prompts; this loader assembles them into runtime artifacts
// consumed by the Realtime session config.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import type { Country } from './config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');

export type Locale = 'da' | 'sv' | 'nb' | 'en' | 'de' | 'ar';

export const COUNTRY_LOCALES: Record<Country, Locale> = {
  dk: 'da',
  se: 'sv',
  no: 'nb',
};

export interface IvrDialog {
  kind: string;
  version: number;
  locale: Locale;
  id: string;
  prompts: { normal: string; slowSpeech: string };
  bargeIn: boolean;
  dtmfFallback: Record<string, string>;
  noInput: { retries: number; then: string };
  noMatch: { retries: number; then: string };
}

export interface IvrPack {
  locale: Locale;
  welcome: IvrDialog;
  intentRouting: IvrDialog;
  applicationStatus: IvrDialog;
  escalateToAgent: IvrDialog;
  recordingDisclosure: string;
}

const DISCLOSURE_LINE = /^- \*\*([a-z]{2,3})\*\*:\s*(.+)$/;

export function loadDisclosureScripts(): Record<string, string> {
  const filePath = path.join(repoRoot, 'apps', 'voice', 'recording-consent', 'recording-disclosure.md');
  const content = fs.readFileSync(filePath, 'utf8');
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(DISCLOSURE_LINE);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function loadDialog(locale: Locale, id: string): IvrDialog {
  const filePath = path.join(repoRoot, 'apps', 'voice', 'ivr', locale, `${id}.yaml`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = yaml.load(raw) as IvrDialog;
  if (parsed.kind !== 'UDCSP.Voice.Dialog') {
    throw new Error(`Unexpected kind '${parsed.kind}' in ${filePath}; expected UDCSP.Voice.Dialog`);
  }
  return parsed;
}

export function loadIvrPack(country: Country): IvrPack {
  const override = process.env.UDCSP_LOCALE_OVERRIDE?.toLowerCase() as Locale | undefined;
  const allowed: Locale[] = ['da', 'sv', 'nb', 'en', 'de', 'ar'];
  const locale: Locale = override && allowed.includes(override) ? override : COUNTRY_LOCALES[country];
  const disclosure = loadDisclosureScripts();
  return {
    locale,
    welcome: loadDialog(locale, 'welcome'),
    intentRouting: loadDialog(locale, 'intent-routing'),
    applicationStatus: loadDialog(locale, 'application-status'),
    escalateToAgent: loadDialog(locale, 'escalate-to-agent'),
    recordingDisclosure: disclosure[locale] ?? disclosure.en,
  };
}

export function loadEscalationPolicy(): unknown {
  const filePath = path.join(repoRoot, 'apps', 'voice', 'escalation', 'escalation-config.yaml');
  if (!fs.existsSync(filePath)) return null;
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}
