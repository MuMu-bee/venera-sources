# venera-sources

Venera 漫画源集合，补了 `onImageLoad` / `onThumbnailLoad`。

## 用法

VeneraX / VeneraNext → 设置 → 漫画源 → 来源库 → 添加来源库，填：

```
https://raw.githubusercontent.com/MuMu-bee/venera-sources/main/index.json
```

## 为什么有这份

Venera 的封面和正文图走两条独立路径：

- `onThumbnailLoad` 只管封面
- `onImageLoad` 只管正文

源里两者都不写时，图片请求只用默认 UA。需要 Referer / Cookie / 签名的站点会返回 **402 或 403**，表现就是「封面能看、正文下载失败」。

本仓库在上游源基础上自动补这两个回调：

- 源自带 `get headers()` → 展开 `{ ...this.headers }`，UA、Referer、Cookie 全带上
- 源没有 headers → 回退标准浏览器 UA

## 自动同步

`.github/workflows/sync.yml` 每周一 04:00 UTC 自动跑：

1. `fetch-upstream.mjs` — 从上游拉 index.json 和全部 js
2. `patch-all.mjs` — 打补丁、提版本号、生成 index.json 和 PATCH_REPORT.md
3. `verify.mjs` — `node --check` 校验，语法不过的自动回退原文件

上游列表在 workflow 的 `UPSTREAM_INDEX*` 环境变量里。

## 补丁规则

`scripts/patch-source.mjs` 只做三件事：

- 找到类字段 `comic = { ... }` 的对象范围（括号计数，跳过字符串内的括号）
- 在末尾插入两个回调
- `version` 提到 `9.9.9`，让 App 认作更新

不做的事：不改上游逻辑、不动 searchUrl、不碰 toc/content 规则。语法不过就回退，不会把坏源推上去。

## 目录

```
index.json              源索引，Venera 读这个
sources/                补丁后的源脚本
scripts/patch-source.mjs  补丁核心
PATCH_REPORT.md         每次同步的补丁结果
```
