#!/usr/bin/env node
/**
 * merge-spec.mjs —— 把浏览器里导出的说明 HTML 合并回原始 index.html
 *
 * 用法：
 *   node merge-spec.mjs <导出的html> <目标index.html> [--dry-run] [--no-backup]
 *
 * 只替换 <script id="prd-data"> 里的数据，原型区 HTML 一个字不动。
 * 合并后打印变更摘要，方便确认 AI 到底改了什么。
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA_RE = /<script id="prd-data" type="application\/json">([\s\S]*?)<\/script>/;

function die(msg) {
  console.error('✖ ' + msg);
  process.exit(1);
}

function extract(html, label) {
  const m = html.match(DATA_RE);
  if (!m) die(`${label} 里找不到 <script id="prd-data" type="application/json"> 数据块，可能不是 PagePrd 产出的文件。`);
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    die(`${label} 的数据块不是合法 JSON：${e.message}`);
  }
}

function walk(a, b, p, out) {
  if (a === b) return;
  const ta = Object.prototype.toString.call(a);
  const tb = Object.prototype.toString.call(b);
  if (ta !== tb || (ta !== '[object Object]' && ta !== '[object Array]')) {
    out.push({ path: p, from: a, to: b });
    return;
  }
  if (ta === '[object Object]') {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const k of keys) walk(a?.[k], b?.[k], p ? `${p}.${k}` : k, out);
    return;
  }
  const n = Math.max((a || []).length, (b || []).length);
  for (let i = 0; i < n; i++) walk(a?.[i], b?.[i], `${p}[${i}]`, out);
}

const short = (v) => {
  if (v === undefined) return '（无）';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (s === undefined) return '（无）';
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
};

/* ---------------- 主流程 ---------------- */
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const files = args.filter((a) => !a.startsWith('--'));

if (files.length < 2) {
  console.error('用法：node merge-spec.mjs <导出的html> <目标index.html> [--dry-run] [--no-backup]');
  process.exit(2);
}

const [srcPath, dstPath] = files.map((f) => path.resolve(f));
if (!fs.existsSync(srcPath)) die(`找不到导出文件：${srcPath}`);
if (!fs.existsSync(dstPath)) die(`找不到目标文件：${dstPath}`);

const srcHtml = fs.readFileSync(srcPath, 'utf8');
const dstHtml = fs.readFileSync(dstPath, 'utf8');

const srcData = extract(srcHtml, path.basename(srcPath));
const dstData = extract(dstHtml, path.basename(dstPath));

/* 防合并错文件 */
if (srcData.system !== dstData.system) {
  die(`系统名不一致：导出文件是「${srcData.system}」，目标是「${dstData.system}」。可能拿错了文件。`);
}
if (srcData.platform !== dstData.platform) {
  die(`平台不一致：导出文件是「${srcData.platform}」，目标是「${dstData.platform}」。移动端和 Web 端不能互相合并。`);
}

/* 计算差异 */
const a = JSON.parse(JSON.stringify(dstData));
const b = JSON.parse(JSON.stringify(srcData));
delete a.__savedAt;
delete b.__savedAt;

const diffs = [];
walk(a, b, '', diffs);

console.log(`\n系统：${srcData.system}（${srcData.platform === 'mobile' ? '移动端' : 'Web'}）`);
console.log(`菜单：${(srcData.menus || []).length} 个   检测到变更：${diffs.length} 处`);

if (diffs.length === 0) {
  console.log('⇢ 导出文件与目标文件内容一致，无需合并。');
  process.exit(0);
}

const MAX = 40;
diffs.slice(0, MAX).forEach((d, i) => {
  console.log(`\n  ${i + 1}. ${d.path || '/'}`);
  console.log(`     - ${short(d.from)}`);
  console.log(`     + ${short(d.to)}`);
});
if (diffs.length > MAX) console.log(`\n  …还有 ${diffs.length - MAX} 处变更未列出`);

if (flags.has('--dry-run')) {
  console.log('\n⇢ --dry-run，未写入文件。');
  process.exit(0);
}

/* 写回 */
const newJson = JSON.stringify(srcData, null, 2).replace(/<\/script/gi, '<\\/script');
const outHtml = dstHtml.replace(DATA_RE, (_, __) =>
  `<script id="prd-data" type="application/json">${newJson}</script>`
);

if (!flags.has('--no-backup')) {
  const bak = dstPath.replace(/\.html?$/i, '') + '.bak.html';
  fs.writeFileSync(bak, dstHtml, 'utf8');
  console.log(`\n⇢ 已备份原文件：${path.relative(process.cwd(), bak)}`);
}

fs.writeFileSync(dstPath, outHtml, 'utf8');
console.log(`⇢ 已合并写入：${path.relative(process.cwd(), dstPath)}`);
console.log('⇢ 原型区 HTML 未改动。建议再跑一次 validate 校验编号覆盖。\n');
