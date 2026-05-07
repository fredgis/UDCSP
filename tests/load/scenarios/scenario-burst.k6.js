// Scenario ID: D1-D10 from docs/biz/uses.md.
// Eval matrix rows: 1-18.
// TODO: case-study scaffold. Composite profile.
export const options={scenarios:{composite:{executor:'constant-arrival-rate',duration:'30m',vus:50,rate:25,timeUnit:'1s',preAllocatedVUs:100,stages:[{duration:'10m',target:100}]}}}; export default function(){}

export function handleSummary(data) {
  return { [`tests/load/results/${__ENV.UDCSP_RESULTS_DATE || 'local'}/scenario-burst.json`]: JSON.stringify(data, null, 2) };
}
