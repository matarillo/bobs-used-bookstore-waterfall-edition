import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { query } from './db.mjs';
import { tables, meanings, kinds } from './model-metadata.mjs';
import { traceability } from './build-traceability.mjs';

const check = process.argv.includes('--check');
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const catalog = {
  columns: await query(`SELECT c.relname AS table_name,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
    a.attnotnull AS required,a.attidentity AS identity,a.attgenerated AS generated,pg_get_expr(d.adbin,d.adrelid) AS default_expression
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='bookstore' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`),
  constraints: await query(`SELECT c.conrelid::regclass::text AS table_name,c.conname AS name,c.contype AS type,
    pg_get_constraintdef(c.oid,true) AS definition,
    coalesce((SELECT json_agg(a.attname ORDER BY k.pos) FROM unnest(c.conkey) WITH ORDINALITY k(num,pos)
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num),'[]'::json) AS columns,
    CASE WHEN c.contype='f' THEN c.confrelid::regclass::text END AS referenced_table,
    coalesce((SELECT json_agg(a.attname ORDER BY k.pos) FROM unnest(c.confkey) WITH ORDINALITY k(num,pos)
      JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num),'[]'::json) AS referenced_columns
    FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='bookstore' ORDER BY table_name,c.conname`),
  indexes: await query("SELECT tablename AS table_name,indexname AS name,indexdef AS definition FROM pg_indexes WHERE schemaname='bookstore' ORDER BY tablename,indexname"),
  views: await query("SELECT viewname AS name,definition FROM pg_views WHERE schemaname='bookstore' ORDER BY viewname")
};
const serialize = value => JSON.stringify(value,null,2)+'\n';
function artifact(file, value) {
  if(check) assert.equal(read(file),value,`Generated artifact differs: ${file}`);
  else writeFileSync(new URL(file,import.meta.url),value);
}
function block(file, marker, value) {
  const original=read(file),start=`<!-- ${marker}:start -->`,end=`<!-- ${marker}:end -->`;
  assert.equal(original.split(start).length,2); assert.equal(original.split(end).length,2);
  const output=original.slice(0,original.indexOf(start)+start.length)+'\n\n'+value.trim()+'\n\n'+original.slice(original.indexOf(end));
  artifact(file,output);
}
const names=[...new Set(catalog.columns.map(c=>c.table_name))];
assert.deepEqual(names.sort(),Object.keys(tables).sort(),'Table metadata must cover the exact schema');
const esc = text => String(text).replaceAll('|','\\|').replaceAll('\n',' ');
let dictionary='';
for(const name of names) {
  const [label,owner,policy]=tables[name];
  dictionary+=`### ${name} — ${label}\n\n所有者：${owner}。${policy}。\n\n| 列 | 型 | 必須 | DB設定 | 意味 |\n| --- | --- | --- | --- | --- |\n`;
  for(const c of catalog.columns.filter(c=>c.table_name===name)) {
    const meaning=c.name==='kind'?kinds[name]:meanings[c.name]; assert.ok(meaning,`Missing meaning: ${name}.${c.name}`);
    const setting=c.identity?'identity always':c.generated?`generated: ${c.default_expression}`:c.default_expression??'—';
    dictionary+=`| \`${c.name}\` | \`${c.type}\` | ${c.required?'必須':'任意'} | ${setting==='—'?'—':'`'+esc(setting)+'`'} | ${meaning} |\n`;
  }
  dictionary+='\n| 制約 | 種類 | 定義 |\n| --- | --- | --- |\n';
  for(const c of catalog.constraints.filter(c=>c.table_name===name)) dictionary+=`| \`${c.name}\` | ${{p:'PK',u:'UNIQUE',f:'FK',c:'CHECK',n:'NOT NULL'}[c.type]??c.type} | \`${esc(c.definition)}\` |\n`;
  dictionary+='\n| 索引 | 定義 |\n| --- | --- |\n';
  for(const i of catalog.indexes.filter(c=>c.table_name===name)) dictionary+=`| \`${i.name}\` | \`${esc(i.definition)}\` |\n`;
  dictionary+='\n';
}
block('../physical-model.md','generated-dictionary',dictionary);

const scopes=[
  ['顧客・購入準備・技術記録',['customer','address','cart','cart_item','book','command_receipt']],
  ['販売・在庫増減',['customer','address','book','sales_order','order_item','order_event','order_state','stock_movement','stock_balance']],
  ['買取・取得・分類',['customer','reference_item','offer','offer_event','offer_state','book','book_receipt']]
];
const represented=new Set(); let diagrams='';
for(const [label,selected] of scopes) {
  diagrams+=`### ${label}\n\n\`\`\`mermaid\nerDiagram\n`;
  const foreign=catalog.constraints.filter(c=>c.type==='f'&&selected.includes(c.table_name)&&selected.includes(c.referenced_table));
  for(const table of selected) {
    const pk=catalog.constraints.find(c=>c.table_name===table&&c.type==='p').columns;
    const fk=foreign.filter(c=>c.table_name===table).flatMap(c=>c.columns);
    const target=foreign.filter(c=>c.referenced_table===table).flatMap(c=>c.referenced_columns);
    const visible=new Set([...pk,...fk,...target]);
    diagrams+=`    ${table} {\n`;
    for(const c of catalog.columns.filter(c=>c.table_name===table&&visible.has(c.name))) {
      const flags=[...(pk.includes(c.name)?['PK']:[]),...(fk.includes(c.name)?['FK']:[])];
      diagrams+=`        ${c.type.replace(/\W+/g,'_')} ${c.name}${flags.length?' '+flags.join(','):''}\n`;
    }
    diagrams+='    }\n';
  }
  for(const fk of foreign) {
    represented.add(fk.name+':'+fk.table_name);
    const child=catalog.columns.filter(c=>c.table_name===fk.table_name);
    const required=fk.columns.every(name=>child.find(c=>c.name===name).required);
    const unique=catalog.constraints.some(c=>c.table_name===fk.table_name&&['p','u'].includes(c.type)&&c.columns.every(n=>fk.columns.includes(n)))
      || (fk.table_name===fk.referenced_table&&fk.columns.includes('previous_sequence'));
    diagrams+=`    ${fk.referenced_table} ${required?'||':'|o'}--${unique?'o|':'o{'} ${fk.table_name} : "${fk.name}"\n`;
  }
  diagrams+='```\n\n';
}
assert.equal(represented.size,catalog.constraints.filter(c=>c.type==='f').length,'Every FK must appear in an ER diagram');
block('../logical-model.md','generated-er',diagrams);
artifact('schema-catalog.json',serialize(catalog));
block('../traceability.md','generated-traceability',traceability());
console.log(`PASS: ${names.length} tables, ${catalog.columns.length} columns, ${represented.size} FKs, generated dictionary and ER diagrams ${check?'match':'written'}`);
