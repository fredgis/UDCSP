// TODO: case-study scaffold. Reads A15 JSONL personas from data/synthetic/personas/*.jsonl.
import { existsSync, readFileSync } from 'fs'; import { join } from 'path';
export type Persona={id:string;name:string;country:'DK'|'SE'|'NO';locale:string;scenarioIds?:string[]};
export function findPersona(pred:(p:Persona)=>boolean):Persona{ const rows=['DK','SE','NO'].flatMap(c=>{const p=join(process.cwd(),'..','..','data','synthetic','personas',`${c}.jsonl`); return existsSync(p)?readFileSync(p,'utf8').split(/?
/).filter(Boolean).map(x=>JSON.parse(x)):[]}); return rows.find(pred)??{id:'scaffold-persona',name:'Synthetic Persona',country:'DK',locale:'en'}; }
