// 用 node --check 校验每个补丁后的源；语法不过的回退到上游原文件
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SRC = 'sources';
const patched = JSON.parse(fs.readFileSync(path.join(SRC, '_patched.json'), 'utf8'));

let ok = 0;
const reverted = [];

for (const entry of patched) {
  const file = path.join(SRC, entry.fileName);
  if (!fs.existsSync(file)) continue;
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    ok++;
  } catch (e) {
    // 回退：重新下载上游原文件，避免把坏语法推上去
    reverted.push(entry.fileName);
    try {
      const res = await fetch(entry.upstream, {
        headers: { 'User-Agent': 'venera-sources-sync/1.0' },
      });
      if (res.ok) {
        fs.writeFileSync(file, await res.text(), 'utf8');
        console.warn('已回退:', entry.fileName);
      } else {
        fs.rmSync(file, { force: true });
        console.warn('回退失败，移除:', entry.fileName);
      }
    } catch {
      fs.rmSync(file, { force: true });
    }
  }
}

// 回退后重新生成 index.json，剔除已移除的文件
const index = JSON.parse(fs.readFileSync('index.json', 'utf8')).filter((x) =>
  fs.existsSync(path.join(SRC, x.fileName)),
);
fs.writeFileSync('index.json', JSON.stringify(index, null, 2), 'utf8');

console.log(`语法通过 ${ok} 个，回退 ${reverted.length} 个`);
if (reverted.length) console.log('回退列表:', reverted.join(', '));
