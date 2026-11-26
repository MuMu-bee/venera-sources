# venera-sources

Venera 漫画源集合，已补 `onImageLoad` / `onThumbnailLoad`。

## 用法

VeneraX / VeneraNext → 设置 → 漫画源 → 来源库 → 添加来源库，填：

```
https://raw.githubusercontent.com/MuMu-bee/venera-sources/main/index.json
```

## 为什么有这份

Venera 的封面和正文图走两条独立路径：`onThumbnailLoad` 只管封面，`onImageLoad` 只管正文。源里两者都不写时只用默认 UA，需要 Referer / Cookie / 签名的站点会返回 402 或 403。

本仓库的源在原脚本基础上补了这两个回调：49 个复用源自身的 `headers` getter，10 个回退到标准浏览器 UA。

## 生成方式

脚本见 `scripts/patch-source.mjs`，GitHub Actions 在 `sync.yml` 里跑：拉取上游 → 打补丁 → `node --check` 校验 → 提交。语法不过的自动回退原文件。
