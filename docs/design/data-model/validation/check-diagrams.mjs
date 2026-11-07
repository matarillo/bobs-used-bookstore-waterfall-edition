// Optional Mermaid syntax verification. Core DB verification has no npm dependencies.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const option=process.argv.indexOf('--tools-dir');
const toolsDir=path.resolve(option<0?path.join(root,'.local/diagram-tools'):process.argv[option+1]);
const require=createRequire(path.join(toolsDir,'loader.cjs'));
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body></body></html>');
for(const name of ['window','document','Element','HTMLElement','SVGElement','Node','DOMParser','XMLSerializer'])
  Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const mermaid=(await import(pathToFileURL(path.join(toolsDir,'node_modules/mermaid/dist/mermaid.core.mjs')).href)).default;
mermaid.initialize({startOnLoad:false,securityLevel:'strict'});
const version=JSON.parse(readFileSync(path.join(toolsDir,'node_modules/mermaid/package.json'),'utf8')).version;
let passed=true;
for(const name of ['conceptual','logical']) {
  const markdown=readFileSync(new URL(`../${name}-model.md`,import.meta.url),'utf8');
  const diagrams=[];
  for(const [i,match] of [...markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)].entries()) {
    try { const parsed=await mermaid.parse(match[1]); diagrams.push({index:i+1,type:parsed.diagramType,passed:true}); }
    catch(error) { diagrams.push({index:i+1,passed:false,error:error.message}); }
  }
  const result={status:'proposed',document:`docs/design/data-model/${name}-model.md`,parser:{name:'mermaid',version},
    source_sha256:createHash('sha256').update(markdown).digest('hex'),diagrams,passed:diagrams.length>0&&diagrams.every(d=>d.passed)};
  writeFileSync(new URL(`diagram-${name}.json`,import.meta.url),JSON.stringify(result,null,2)+'\n');
  passed&&=result.passed; console.log(`${result.passed?'PASS':'FAIL'}: ${name}, ${diagrams.length} diagrams, Mermaid ${version}`);
}
dom.window.close();
if(!passed) process.exitCode=1;
