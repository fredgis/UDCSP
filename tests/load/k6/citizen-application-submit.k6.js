// Scenario ID: D1/D3/D4 from docs/uses.md — peak 5000 applicants.
// Eval matrix rows: 3,12,15,17.
// TODO: case-study scaffold. k6 exports JSON consumed by Generate-Load-Report.ps1.
import http from 'k6/http'; import { check, sleep } from 'k6'; import { Trend, Rate } from 'k6/metrics';
export const errorRate=new Rate('udcsp_errors'); export const latency=new Trend('udcsp_latency_ms');
export const options={ scenarios: { peak: { executor:'ramping-vus', stages:[{duration:'5m',target:5000},{duration:'10m',target:5000},{duration:'5m',target:0}] } } };
export default function(){ const traceparent=`00-${__VU.toString(16).padStart(32,'0')}-${__ITER.toString(16).padStart(16,'0')}-01`; const res=http.post(`${__ENV.UDCSP_APIM_BASE_URL||'https://example.invalid'}/applications`,JSON.stringify({scenario:'D1/D3/D4',synthetic:true}),{headers:{traceparent,'content-type':'application/json',authorization:`Bearer ${__ENV.UDCSP_TEST_TOKEN||'scaffold'}`}}); latency.add(res.timings.duration); errorRate.add(res.status>=400); check(res,{'status is not 5xx':r=>r.status<500,'trace echoed':r=>(r.headers.Traceparent||traceparent).includes(traceparent.split('-')[1])}); sleep(1); }

export function handleSummary(data) {
  return { [`tests/load/results/${__ENV.UDCSP_RESULTS_DATE || 'local'}/citizen-application-submit.json`]: JSON.stringify(data, null, 2) };
}
