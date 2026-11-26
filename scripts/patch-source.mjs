// 给 Venera 漫画源补 onImageLoad / onThumbnailLoad，让正文图片请求带上站点 header。
// 背景：VeneraNext / VeneraX 里封面与正文图走两条解析路径，
//      comic.onThumbnailLoad 只负责封面，comic.onImageLoad 只负责正文，
//      两者都不写时只用默认 UA，需要 Referer/Cookie/签名的站点会 402/403。

const UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

/** 找到 `comic = {` 对象体的结束大括号下标，并探测成员缩进 */
export function findComicObjectRange(src) {
  const m = /\n(\s*)comic\s*=\s*\{/.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  // 探测第一个成员行的缩进，避免写死 +2/+4 导致缩进错乱
  const after = src.slice(start + 1);
  const firstMember = /\n(\s+)\S/.exec(after);
  const memberIndent = firstMember ? firstMember[1] : m[1] + '  ';
  let depth = 0;
  let inStr = null;
  let esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') { depth++; continue; }
    if (c === '}') {
      depth--;
      if (depth === 0) return { start, end: i, indent: m[1], memberIndent };
    }
  }
  return null;
}

/** 判断源是否已经自带图片请求配置 */
export function hasImageHooks(src) {
  return /onImageLoad\s*:/.test(src) || /onImageLoad\s*\(/.test(src);
}

/** 生成要插入的成员代码 */
export function buildHooks(memberIndent, usesThisHeaders) {
  const pad = memberIndent;
  const body = usesThisHeaders
    ? 'headers: { ...this.headers }'
    : `headers: {\n${pad}    "User-Agent": "${UA}",\n${pad}    "Accept": "image/*,*/*;q=0.8",\n${pad}}`;
  const thumb = usesThisHeaders
    ? 'headers: { ...this.headers }'
    : `headers: { "User-Agent": "${UA}" }`;
  return (
    `\n${pad}onImageLoad: (imageKey, comicId, epId) => ({\n` +
    `${pad}    url: imageKey,\n` +
    `${pad}    ${body},\n` +
    `${pad}}),\n` +
    `${pad}onThumbnailLoad: (imageKey) => ({\n` +
    `${pad}    url: imageKey,\n` +
    `${pad}    ${thumb},\n` +
    `${pad}}),`
  );
}

/** 对单个源脚本打补丁；返回 {code, changed, reason} */
export function patchSource(src) {
  if (typeof src !== 'string' || src.length < 200) {
    return { code: src, changed: false, reason: 'too-small' };
  }
  if (!/loadEp/.test(src)) return { code: src, changed: false, reason: 'no-loadEp' };
  if (hasImageHooks(src)) return { code: src, changed: false, reason: 'already-has-hooks' };

  const range = findComicObjectRange(src);
  if (!range) return { code: src, changed: false, reason: 'no-comic-object' };

  const usesThisHeaders = /get\s+headers\s*\(\s*\)/.test(src);
  let head = src.slice(0, range.end).replace(/\s+$/, '');
  if (!head.endsWith(',')) head += ',';
  const code = head + buildHooks(range.memberIndent, usesThisHeaders) + '\n' + src.slice(range.end);

  return { code, changed: true, reason: usesThisHeaders ? 'patched-headers' : 'patched-static' };
}

/** 提升 version，避免 App 认为没有更新 */
export function bumpVersion(src, version = '9.9.9') {
  return src.replace(/(\bversion\s*=\s*)"[^"]*"/, `$1"${version}"`);
}
