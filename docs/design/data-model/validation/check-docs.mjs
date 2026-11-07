import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { traceability } from './build-traceability.mjs';
import './check-baseline.mjs';

const base=fileURLToPath(new URL('../',import.meta.url));
const walk=folder=>readdirSync(folder).flatMap(name=>{
  const full=path.join(folder,name); return statSync(full).isDirectory()?walk(full):[full];
});
const docs=walk(base).filter(file=>file.endsWith('.md'));
const checks=[];
function check(name,fn) { fn(); checks.push({name,passed:true}); }
check('All design documents declare proposed status',()=>{
  for(const file of docs) assert.match(readFileSync(file,'utf8'),/^---\r?\ndocument: .+\r?\nstatus: proposed\r?\n---/);
});
check('Local document links and referenced anchors exist',()=>{
  for(const file of docs) for(const match of readFileSync(file,'utf8').matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const url=match[1]; if(/^[a-z]+:\/\//i.test(url)) continue;
    const [local,anchor]=url.split('#'); const target=path.resolve(path.dirname(file),decodeURIComponent(local||path.basename(file)));
    assert.ok(existsSync(target),`${path.relative(base,file)}: ${url}`);
    if(anchor&&target.endsWith('.md')) {
      const headings=[...readFileSync(target,'utf8').matchAll(/^#{1,6} (.+)$/gm)].map(m=>m[1].trim().toLowerCase().replace(/[()（）`]/g,'').replaceAll(' ','-'));
      assert.ok(headings.includes(decodeURIComponent(anchor)),`${url}: unknown anchor`);
    }
  }
});
const result=JSON.parse(readFileSync(new URL('results.json',import.meta.url),'utf8'));
check('SQL verification passed and hashes match the current inputs',()=>{
  assert.equal(result.passed,true); assert.ok(result.checks.length>=31);
  for(const [file,digest] of Object.entries(result.hashes)) assert.equal(createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex'),digest,file);
});
check('Requirement mapping is complete and every test reference exists',()=>{
  const generated=traceability(); const current=readFileSync(path.join(base,'traceability.md'),'utf8');
  assert.ok(current.includes(generated.trim()));
  const testIds=new Set(result.checks.map(c=>c.id));
  for(const text of [generated,...docs.map(f=>readFileSync(f,'utf8'))]) for(const m of text.matchAll(/\bT\d{2}\b/g)) assert.ok(testIds.has(m[0]),m[0]);
});
check('All twelve patterns are assessed',()=>{
  const text=readFileSync(path.join(base,'conceptual-model.md'),'utf8');
  for(let i=1;i<=12;i++) assert.match(text,new RegExp('\\| P'+String(i).padStart(3,'0')+' '));
});
check('Mermaid parse evidence matches the current diagrams',()=>{
  for(const name of ['conceptual','logical']) {
    const evidence=JSON.parse(readFileSync(new URL(`diagram-${name}.json`,import.meta.url),'utf8'));
    assert.equal(evidence.passed,true);
    assert.equal(evidence.source_sha256,createHash('sha256').update(readFileSync(path.join(base,`${name}-model.md`))).digest('hex'));
  }
});
check('All schema tables and FKs are represented in the generated documents',()=>{
  const catalog=JSON.parse(readFileSync(new URL('schema-catalog.json',import.meta.url),'utf8'));
  const physical=readFileSync(path.join(base,'physical-model.md'),'utf8');
  const logical=readFileSync(path.join(base,'logical-model.md'),'utf8');
  for(const table of new Set(catalog.columns.map(c=>c.table_name))) assert.ok(physical.includes(`### ${table} —`));
  for(const fk of catalog.constraints.filter(c=>c.type==='f')) assert.ok(logical.includes(`: "${fk.name}"`));
  for(const c of catalog.columns) assert.ok(physical.includes(`| \`${c.name}\` | \`${c.type}\` |`));
});
check('Repository entry points link to the data model',()=>{
  const root=fileURLToPath(new URL('../../../../',import.meta.url));
  assert.ok(readFileSync(path.join(root,'README.md'),'utf8').includes('docs/design/data-model/README.md'));
  assert.ok(readFileSync(path.join(root,'docs/README.md'),'utf8').includes('design/data-model/README.md'));
});
const summary={status:'proposed',checks,passed:true,documents:docs.length,db_cases:result.checks.length};
writeFileSync(new URL('document-results.json',import.meta.url),JSON.stringify(summary,null,2)+'\n');
console.log(`PASS: ${checks.length} document checks, ${docs.length} documents, ${result.checks.length} DB cases`);
