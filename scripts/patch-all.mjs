// 对 sources/ 下所有源打补丁，然后写 index.json
import fs from 'node:fs';
import path from 'node:path';
import { patchSource, bumpVersion } from './patch-source.mjs';

const SRC = 'sources';
const collected = JSON.parse(
  fs.readFileSync(path.join(SRC, '_collected.json'), 'utf8'),
);

const results = [];

for (const entry of collected) {
  const file = path.join(SRC, entry.fileName);
  if (!fs.existsSync(file)) continue;

  const original = fs.readFileSync(file, 'utf8');
  const r = patchSource(original);

  let code = original;
  let status = 'skipped';
  if (r.changed) {
    code = bumpVersion(r.code);
    status = r.reason; // patched-headers / patched-static
  } else {
    status = r.reason; // already-has-hooks / no-comic-object / no-loadEp ...
  }

  fs.writeFileSync(file, code, 'utf8');
  results.push({ ...entry, patch: status });
}

// index.json：只收录存在于磁盘的源
const index = results
  .filter((x) => fs.existsSync(path.join(SRC, x.fileName)))
  .map((x) => ({
    name: x.name,
    fileName: x.fileName,
    key: x.key,
    version: x.version,
    description: x.description || 'Venera 漫画源',
  }));

fs.writeFileSync('index.json', JSON.stringify(index, null, 2), 'utf8');
fs.writeFileSync(
  'PATCH_REPORT.md',
  [
    '# 补丁报告',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    `| 源 | key | 补丁状态 |`,
    `|---|---|---|`,
    ...results.map((x) => `| ${x.name} | \`${x.key}\` | ${x.patch} |`),
    '',
    `合计 ${results.length} 个源；已打补丁 ${
      results.filter((x) => x.patch.startsWith('patched')).length
    } 个。`,
  ].join('\n'),
  'utf8',
);

fs.writeFileSync(
  path.join(SRC, '_patched.json'),
  JSON.stringify(results, null, 2),
  'utf8',
);

const stats = results.reduce((m, x) => {
  m[x.patch] = (m[x.patch] || 0) + 1;
  return m;
}, {});
console.log('补丁统计:', stats);
console.log('index.json 条目:', index.length);
