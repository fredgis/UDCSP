// Unit tests for the Foundry topic-router function-tool definitions.
// We assert the JSON schema GPT Realtime sees, not the runtime call (which
// requires APIM + a real OAuth token). The schema is the contract.

import { describe, it, expect } from 'vitest';
import { TOOL_DEFS } from '../src/foundry-tool.js';

const tools = TOOL_DEFS as readonly any[];

describe('foundry-tool TOOL_DEFS', () => {
  it('exposes exactly three tools', () => {
    expect(tools).toHaveLength(3);
  });

  it('declares lookup_topic_router with required text + locale', () => {
    const tool = tools.find((t) => t.name === 'lookup_topic_router');
    expect(tool).toBeDefined();
    expect(tool.parameters.required).toContain('text');
    expect(tool.parameters.required).toContain('locale');
    expect(tool.parameters.properties.locale.enum).toEqual(['da', 'sv', 'nb', 'en']);
  });

  it('declares escalate_to_human with reason enum aligned to escalation-rules.json', () => {
    const tool = tools.find((t) => t.name === 'escalate_to_human');
    expect(tool.parameters.required).toContain('reason');
    expect(tool.parameters.properties.reason.enum).toEqual([
      'low_confidence',
      'sensitive_topic',
      'citizen_request',
      'sentiment_negative',
      'cross_border',
    ]);
  });

  it('declares end_call_with_recap with required recapText', () => {
    const tool = tools.find((t) => t.name === 'end_call_with_recap');
    expect(tool.parameters.required).toContain('recapText');
  });
});

