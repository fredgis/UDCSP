// TODO: case-study scaffold. Replace paths with services/apim/apis/*/openapi.yaml operations.
import { APIRequestContext, expect } from '@playwright/test';
export const authHeaders=(traceparent:string, token?:string)=>({ traceparent, 'content-type':'application/json', ...(token?{authorization:`Bearer ${token}`}:{}) });
export async function getJson(request:APIRequestContext,path:string,traceparent:string,token?:string){ const r=await request.get(path,{headers:authHeaders(traceparent,token)}); expect(r.ok(), path).toBeTruthy(); return r.json(); }
export async function postJson(request:APIRequestContext,path:string,body:unknown,traceparent:string,token?:string){ const r=await request.post(path,{data:body,headers:authHeaders(traceparent,token)}); expect(r.ok(), path).toBeTruthy(); return r.json(); }
export async function expectTraceVisible(request:APIRequestContext,traceparent:string){ const id=traceparent.split('-')[1]; const t=await getJson(request,`/observability/traces/${id}`,traceparent,process.env.UDCSP_TEST_TOKEN); expect(t.traceId).toBe(id); expect(t.backends).toEqual(expect.arrayContaining(['apim','foundry'])); }
