#!/usr/bin/env node
/**
 * export-md.mjs —— 把 index.html 里的需求说明抽成 Markdown
 *
 * 用法：
 *   node export-md.mjs <index.html> [输出.md]
 *
 * 默认输出到同目录：<系统名>-需求说明-<时间戳>.md
 * 只读 HTML，不改任何文件。
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA_RE = /<script id="prd-data" type="application\/json">([\s\S]*?)<\/script>/;

const COLS = {
  list: [['el', '元素'], ['type', '类型'], ['logic', '展示逻辑说明'], ['note', '备注']],
  'form-add': [['el', '元素'], ['type', '类型'], ['required', '必填'], ['rule', '校验规则'], ['default', '默认值'], ['note', '备注']],
  'form-edit': [['el', '元素'], ['type', '类型'], ['required', '必填'], ['rule', '校验规则'], ['default', '默认值'], ['note', '备注']],
  detail: [['group', '分组'], ['name', '字段名'], ['logic', '展示逻辑说明'], ['note', '备注']]
};

const now = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return {
    human: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`,
    stamp: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  };
};

const cellText = (v) =>
  String(v == null ? '' : v)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>')
    .trim();

function mdTable(head, rows) {
  const out = [];
  out.push('| ' + head.map(cellText).join(' | ') + ' |');
  out.push('| ' + head.map(() => '---').join(' | ') + ' |');
  rows.forEach((r) => out.push('| ' + r.map(cellText).join(' | ') + ' |'));
  return out.join('\n');
}

function mdBlocks(blocks) {
  const out = [];
  (blocks || []).forEach((b) => {
    if (b.type === 'para') {
      out.push(b.text || '');
    } else if (b.type === 'kv') {
      (b.rows || []).forEach((r) => out.push(`- **${r.k}**：${r.v == null ? '' : r.v}`));
    } else if (b.type === 'list') {
      (b.items || []).forEach((it) => out.push(`- ${it}`));
    } else if (b.type === 'table') {
      out.push(mdTable(b.head || [], b.rows || []));
    }
    out.push('');
  });
  return out;
}

/* ---------------- 主流程 ---------------- */
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('用法：node export-md.mjs <index.html> [输出.md]');
  process.exit(2);
}

const src = path.resolve(args[0]);
if (!fs.existsSync(src)) {
  console.error(`✖ 找不到文件：${src}`);
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf8');
const m = html.match(DATA_RE);
if (!m) {
  console.error('✖ 文件里找不到 <script id="prd-data"> 数据块，可能不是 PagePrd 产出的文件。');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(m[1]);
} catch (e) {
  console.error('✖ 数据块不是合法 JSON：' + e.message);
  process.exit(1);
}

const t = now();
const menus = data.menus || [];
const fpCount = menus.reduce(
  (n, mu) => n + (mu.sections || []).reduce(
    (k, s) => k + (s.type === 'features' && s.items ? s.items.length : 0), 0),
  0
);

const L = [];
L.push(`# ${data.system || '未命名系统'} · 需求说明`);
L.push('');
L.push(`- **平台**：${data.platform === 'mobile' ? '移动端' : 'Web'}`);
L.push(`- **菜单数**：${menus.length}`);
L.push(`- **功能点数**：${fpCount}`);
L.push(`- **导出时间**：${t.human}`);
L.push('');
L.push('> 本文由 PagePrd 从原型文件自动导出。原型与说明的对应关系以功能点编号为准。');
L.push('');
L.push('---');
L.push('');

menus.forEach((menu, mi) => {
  L.push(`## ${mi + 1}. ${menu.name || '未命名菜单'}`);
  L.push('');
  if (menu.summary) {
    L.push(`> ${menu.summary}`);
    L.push('');
  }

  // 与页面渲染保持一致：布局说明在前，异常场景在后
  const secList = (menu.sections || []).map((sec) => sec);
  secList.sort((a, b) => {
    const rank = (t) => (t === 'layout' ? 0 : (t === 'exceptions' ? 2 : 1));
    return rank(a.type) - rank(b.type);
  });

  secList.forEach((sec, si) => {
    L.push(`### ${mi + 1}.${si + 1} ${sec.title || '未命名章节'}`);
    L.push('');
    if (sec.note) {
      L.push(`> ${sec.note}`);
      L.push('');
    }

    if (sec.type === 'features') {
      (sec.items || []).forEach((item) => {
        L.push(`#### ${item.fp}. ${item.name || ''}`);
        L.push('');
        if (item.desc) {
          L.push(item.desc);
          L.push('');
        }
        if (item.precondition) {
          L.push(`> **前置条件**：${item.precondition}`);
          L.push('');
        }
        if (item.flow && item.flow.length) {
          L.push('**业务流程**');
          L.push('');
          item.flow.forEach((n, i) => {
            const mark = n.type === 'branch' ? '◆' : (n.type === 'start' || n.type === 'end' ? '●' : '○');
            L.push(`${i + 1}. ${mark} ${n.t || ''}${n.note ? `　*（${n.note}）*` : ''}`);
          });
          L.push('');
        }
        if (item.fields && item.fields.rows && item.fields.rows.length) {
          const cols = COLS[item.fields.table] || COLS.list;
          if (item.fields.caption) {
            L.push(`**${item.fields.caption}**`);
            L.push('');
          }
          L.push(mdTable(cols.map((c) => c[1]), item.fields.rows.map((r) => cols.map((c) => r[c[0]]))));
          L.push('');
        }
        if (item.rules && item.rules.length) {
          L.push('**业务规则**');
          L.push('');
          item.rules.forEach((r, i) => L.push(`${i + 1}. ${r}`));
          L.push('');
        }
        if (item.exceptions && item.exceptions.length) {
          L.push('**异常场景**');
          L.push('');
          item.exceptions.forEach((r) => {
            L.push(`- **${r.scene || ''}**`);
            if (r.behavior) L.push(`  - 系统表现：${r.behavior}`);
            if (r.message) L.push(`  - 提示文案：${r.message}`);
          });
          L.push('');
        }
        if (item.states && item.states.length) {
          L.push('**状态流转**：' + item.states.join(' → '));
          L.push('');
        }
      });
    } else if (sec.type === 'layout') {
      (sec.rows || []).forEach((r) => L.push(`- **${r.k}**：${r.v}`));
      L.push('');
    } else if (sec.type === 'interactions') {
      (sec.items || []).forEach((it) => {
        L.push(`#### ${it.panel || '未命名面板'}`);
        L.push('');
        [['trigger', '触发方式'], ['content', '面板内容'], ['close', '关闭方式'], ['form', '展现形式'], ['anim', '动画效果']]
          .forEach(([k, label]) => {
            if (it[k]) L.push(`- **${label}**：${it[k]}`);
          });
        L.push('');
      });
    } else if (sec.type === 'exceptions') {
      (sec.rows || []).forEach((r) => {
        L.push(`- **${r.scene || ''}**`);
        if (r.behavior) L.push(`  - 系统表现：${r.behavior}`);
        if (r.message) L.push(`  - 提示文案：${r.message}`);
      });
      L.push('');
    } else if (sec.type === 'permission') {
      L.push(
        mdTable(
          ['功能点', '操作权限', '数据权限', '备注'],
          (sec.rows || []).map((r) => [r.name, r.ops, r.data, r.note])
        )
      );
      L.push('');
    } else {
      L.push(...mdBlocks(sec.blocks));
    }
  });
});

const outPath = args[1]
  ? path.resolve(args[1])
  : path.join(path.dirname(src), `${data.system || 'system'}-需求说明-${t.stamp}.md`);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, L.join('\n'), 'utf8');

console.log(`⇢ 已生成：${outPath}`);
console.log(`  菜单 ${menus.length} 个，功能点 ${fpCount} 个，共 ${L.length} 行`);
