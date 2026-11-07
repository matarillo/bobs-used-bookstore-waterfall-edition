import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';

export const quote = value => value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
export const args = ['-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose',
  '-h', '127.0.0.1', '-p', process.env.BOBS_MODEL_PORT ?? '55468', '-U', 'bobs_model', '-d', 'bobs_model_validation'];

export class Session {
  constructor() {
    this.child = spawn(process.env.PSQL ?? 'psql', args, { windowsHide: true });
    this.lines = [];
    this.errors = '';
    this.pending = null;
    this.closed = new Promise(resolve => { this.resolveClosed = resolve; });
    this.child.stderr.on('data', d => { this.errors += d; });
    createInterface({ input: this.child.stdout }).on('line', line => {
      if (this.pending && line === this.pending.marker) {
        const { resolve } = this.pending;
        this.pending = null;
        resolve(this.lines.splice(0));
      } else { this.lines.push(line); }
    });
    this.child.on('error', error => { this.failure = error; this.pending?.reject(error); this.pending = null; });
    this.child.on('close', code => {
      this.failure ??= new Error(`psql exited (${code}): ${this.errors}`);
      this.pending?.reject(this.failure);
      this.pending = null;
      this.resolveClosed();
    });
  }
  exec(sql) {
    if (this.failure) return Promise.reject(this.failure);
    if (this.pending) throw new Error('Concurrent queries on one connection are not supported');
    const marker = `END_${randomUUID()}`;
    return new Promise((resolve, reject) => {
      this.pending = { marker, resolve, reject };
      this.child.stdin.write(`${sql}\n\\echo ${marker}\n`);
    });
  }
  async rows(sql) {
    return JSON.parse((await this.exec(`WITH _result AS (${sql}) SELECT coalesce(json_agg(_result), '[]'::json) FROM _result;`)).join('\n'));
  }
  async close() {
    if (!this.failure) this.child.stdin.end('\\q\n');
    await this.closed;
  }
}

export async function connect() {
  const s = new Session();
  await s.exec("SET search_path=bookstore,public; SET TIME ZONE 'UTC'; SET lock_timeout='5s'; SET statement_timeout='15s';");
  return s;
}
export async function query(sql) {
  const s = await connect();
  try { return await s.rows(sql); } finally { await s.close(); }
}
export async function execute(sql) {
  const s = await connect();
  try { return await s.exec(sql); } finally { await s.close(); }
}
export async function transaction(work) {
  const s = await connect();
  try {
    await s.exec('BEGIN ISOLATION LEVEL READ COMMITTED;');
    const value = await work(s);
    await s.exec('COMMIT;');
    return value;
  } catch (error) {
    if (!s.failure) await s.exec('ROLLBACK;');
    throw error;
  } finally { await s.close(); }
}
