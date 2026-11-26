// 拉取上游源库，把 index 与 js 存到 sources/ 下（只做下载与整理，不改内容）
import fs from 'node:fs';
import path from 'node:path';

const UPSTREAMS = [
  process.env.UPSTREAM_INDEX,
  process.env.UPSTREAM_INDEX_2,
  process.env.UPSTREAM_INDEX_3,
].filter(Boolean);

const UA = 'Mozilla/5.0 (compatible; venera-sources-sync/1.0)';
const OUT = 'sources';

async function get(url, asJson = false) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asJson ? res.json() : res.text();
}

/** 从 index.json 的 URL 推导同目录 base */
function baseOf(indexUrl) {
  return indexUrl.slice(0, indexUrl.lastIndexOf('/') + 1);
}

function safeName(name) {
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const collected = [];
  const seen = new Set();

  for (const indexUrl of UPSTREAMS) {
    const base = baseOf(indexUrl);
    let list;
    try {
      list = await get(indexUrl, true);
    } catch (e) {
      console.warn('上游索引不可用，跳过:', indexUrl, e.message);
      continue;
    }
    if (!Array.isArray(list)) {
      console.warn('索引格式不是数组，跳过:', indexUrl);
      continue;
    }

    for (const entry of list) {
      const key = String(entry?.key ?? '').trim();
      if (!key) continue;
      // 同名优先保留先出现的（上游顺序即优先级）
      if (seen.has(key)) continue;

      const fileName = String(entry.fileName ?? `${key}.js`).trim();
      const jsUrl = base + fileName;
      let code;
      try {
        code = await get(jsUrl);
      } catch (e) {
        console.warn('源下载失败，跳过:', key, e.message);
        continue;
      }
      if (!code || code.length < 200) {
        console.warn('源内容过短，跳过:', key);
        continue;
      }

      const outName = `${safeName(key)}.js`;
      fs.writeFileSync(path.join(OUT, outName), code, 'utf8');
      seen.add(key);
      collected.push({
        name: String(entry.name ?? key),
        fileName: outName,
        key,
        version: String(entry.version ?? '1.0.0'),
        description: String(entry.description ?? ''),
        upstream: jsUrl,
      });
    }
  }

  fs.writeFileSync(
    path.join(OUT, '_collected.json'),
    JSON.stringify(collected, null, 2),
    'utf8',
  );
  console.log(`下载完成: ${collected.length} 个源，来自 ${UPSTREAMS.length} 个上游`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
