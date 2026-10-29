#!/usr/bin/env node
/**
 * validate.mjs —— 交付前自检（对应"坑 2：交付前自己扫一遍"）
 *
 * 用法：
 *   node validate.mjs <index.html>
 *
 * 检查原型与说明是否一一对应，退出码 1 表示有必须修的错误。
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA_RE = /<script id="prd-data" type="application\/json">([\s\S]*?)<\/script>/;

const errors = [];
const warns = [];
const passes = [];

const E = (m) => errors.push(m);
const W = (m) => warns.push(m);
const P = (m) => passes.push(m);

/* ---------------- 读文件 ---------------- */
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('用法：node validate.mjs <index.html>');
  process.exit(2);
}
const file = path.resolve(args[0]);
if (!fs.existsSync(file)) {
  console.error(`✖ 找不到文件：${file}`);
  process.exit(1);
}
const html = fs.readFileSync(file, 'utf8');

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
P('数据块是合法 JSON');

const menus = data.menus || [];
if (!menus.length) E('menus 为空，没有任何菜单');
else P(`共 ${menus.length} 个菜单`);

/* ---------------- 切分原型区的 page ---------------- */
const pageStartRe = /<div class="page[^"]*"\s+data-menu="([^"]+)"/g;
const starts = [];
let mm;
while ((mm = pageStartRe.exec(html))) {
  starts.push({ id: mm[1], at: mm.index });
}

const pageHtml = {};
starts.forEach((s, i) => {
  const end = i + 1 < starts.length ? starts[i + 1].at : html.length;
  pageHtml[s.id] = html.slice(s.at, end);
});

/* 1. 菜单与 page 对齐 */
menus.forEach((mu) => {
  if (!pageHtml[mu.id]) {
    E(`菜单「${mu.name}」（id=${mu.id}）在原型区找不到对应的 .page[data-menu="${mu.id}"]`);
  }
});
Object.keys(pageHtml).forEach((id) => {
  if (!menus.some((mu) => mu.id === id)) {
    W(`原型区有 .page[data-menu="${id}"]，但 PRD_DATA 里没有这个菜单，右侧将无说明可显示`);
  }
});
if (menus.every((mu) => pageHtml[mu.id])) P('所有菜单都有对应的原型页面');

/* 2. 收集每个 page 的编号 */
const fpInPage = {};
Object.keys(pageHtml).forEach((id) => {
  const set = new Set();
  const re = /data-fp="(\d+)"/g;
  let x;
  while ((x = re.exec(pageHtml[id]))) set.add(Number(x[1]));
  fpInPage[id] = set;
});

/* 3. 双向核对 */
let fpTotal = 0;
menus.forEach((mu) => {
  const declared = new Map();
  (mu.sections || []).forEach((sec) => {
    // 只有 features 章节里的 items 是功能点；interactions 的 items 是面板，不参与编号核对
    if (sec.type !== 'features') return;
    (sec.items || []).forEach((it) => {
      fpTotal++;
      if (it.fp == null) {
        E(`菜单「${mu.name}」的章节「${sec.title}」里有功能点没写编号（name=${it.name || '未命名'}）`);
        return;
      }
      if (declared.has(it.fp)) {
        E(`菜单「${mu.name}」里编号 ${it.fp} 重复定义：「${declared.get(it.fp)}」和「${it.name}」`);
      }
      declared.set(it.fp, it.name);

      if (!it.name) E(`菜单「${mu.name}」编号 ${it.fp} 没有功能点名称`);
      if (!it.desc) W(`菜单「${mu.name}」编号 ${it.fp}「${it.name}」没有描述`);
      if ((!it.rules || !it.rules.length) && (!it.fields || !it.fields.rows)) {
        W(`菜单「${mu.name}」编号 ${it.fp}「${it.name}」既没有字段表也没有业务规则，说明过于单薄`);
      }
    });
  });

  const inProto = fpInPage[mu.id] || new Set();
  declared.forEach((name, fp) => {
    if (!inProto.has(fp)) {
      E(`菜单「${mu.name}」编号 ${fp}「${name}」在左侧原型里找不到挂 data-fp="${fp}" 的元素`);
    }
  });
  inProto.forEach((fp) => {
    if (!declared.has(fp)) {
      E(`菜单「${mu.name}」原型里有 data-fp="${fp}"，但右侧说明里没有这个功能点`);
    }
  });
});
if (fpTotal) P(`共 ${fpTotal} 个功能点`);

/* 4. 编号不能挂在 tr 上（浏览器会忽略 tr 的定位） */
const trFp = html.match(/<tr[^>]*data-fp="/g);
if (trFp) W(`有 ${trFp.length} 处 data-fp 挂在 <tr> 上，编号气泡定位会失效，请移到 <td> 或行内按钮上`);

/* 4.5 PRD 结构完整性：布局说明 / 交互说明 / 异常场景 / 业务流程 */
let cntLayout = 0, cntIa = 0, cntEx = 0, cntFlow = 0, cntExFp = 0;
const menusNoIa = [], menusNoEx = [];

menus.forEach((mu) => {
  const secs = mu.sections || [];

  const lay = secs.find((x) => x.type === 'layout');
  if (!lay) {
    E(`菜单「${mu.name}」缺布局说明（layout 章节），每个页面顶部都必须写`);
  } else {
    cntLayout++;
    if (!lay.rows || !lay.rows.length) E(`菜单「${mu.name}」的布局说明没有内容行`);
    (lay.rows || []).forEach((r, i) => {
      if (!r.k) W(`菜单「${mu.name}」布局说明第 ${i + 1} 行缺左侧标签`);
      if (!r.v) W(`菜单「${mu.name}」布局说明第 ${i + 1} 行缺内容`);
    });
  }

  secs.forEach((sec) => {
    if (sec.type === 'interactions') {
      if (!sec.items || !sec.items.length) E(`菜单「${mu.name}」的交互说明没有任何面板`);
      (sec.items || []).forEach((it, i) => {
        cntIa++;
        const lack = ['panel', 'trigger', 'content', 'close', 'form', 'anim'].filter((k) => !it[k]);
        if (lack.length) W(`菜单「${mu.name}」交互说明「${it.panel || '第' + (i + 1) + '个'}」缺字段：${lack.join('、')}`);
      });
    }
    if (sec.type === 'exceptions') {
      if (!sec.rows || !sec.rows.length) E(`菜单「${mu.name}」的页面级异常没有任何条目`);
      (sec.rows || []).forEach((r, i) => {
        cntEx++;
        if (!r.scene) E(`菜单「${mu.name}」页面级异常第 ${i + 1} 条缺「场景」`);
        if (!r.behavior) W(`菜单「${mu.name}」页面级异常「${r.scene || i + 1}」缺「系统表现」`);
        if (!r.message) W(`菜单「${mu.name}」页面级异常「${r.scene || i + 1}」缺「提示文案」`);
      });
    }
    if (sec.type === 'features') {
      (sec.items || []).forEach((it) => {
        if (it.flow && it.flow.length) {
          cntFlow++;
          it.flow.forEach((n, i) => {
            if (!n.t) E(`菜单「${mu.name}」功能点「${it.name}」业务流程第 ${i + 1} 步没有文字`);
          });
        }
        // 功能点级异常：字段必须齐
        if (it.exceptions && it.exceptions.length) {
          it.exceptions.forEach((r, i) => {
            cntEx++;
            cntExFp++;
            if (!r.scene) E(`菜单「${mu.name}」功能点「${it.name}」异常第 ${i + 1} 条缺「场景」`);
            if (!r.behavior) W(`菜单「${mu.name}」功能点「${it.name}」异常「${r.scene || i + 1}」缺「系统表现」`);
            if (!r.message) W(`菜单「${mu.name}」功能点「${it.name}」异常「${r.scene || i + 1}」缺「提示文案」`);
          });
        }
      });
    }
  });
});

if (cntLayout) P(`${cntLayout} 个页面有布局说明`);
if (cntIa || cntEx || cntFlow) {
  P(`交互面板 ${cntIa} 个 · 异常场景 ${cntEx} 条（功能点级 ${cntExFp} 条 + 页面级 ${cntEx - cntExFp} 条）· 业务流程 ${cntFlow} 条`);
}

/* 4.6 覆盖度：不能只给一两个页面写，其余空着 */
menus.forEach((mu) => {
  const secs = mu.sections || [];
  if (!secs.some((x) => x.type === 'interactions')) menusNoIa.push(mu.name);
  if (!secs.some((x) => x.type === 'exceptions')) menusNoEx.push(mu.name);
});
if (menusNoIa.length && menusNoIa.length < menus.length) {
  W(`这 ${menusNoIa.length} 个页面没有交互说明：${menusNoIa.join('、')}，用户翻到这些页面会以为功能没做`);
}
if (menusNoEx.length && menusNoEx.length < menus.length) {
  W(`这 ${menusNoEx.length} 个页面没有异常场景：${menusNoEx.join('、')}，上线后这些路径没人兜底`);
}

/* 4.7 异常场景总量：页面级 + 功能点级合计至少 3 条，且页面级不能只有 1 条孤零零的 */
menus.forEach((mu) => {
  const secs = mu.sections || [];
  let pageRows = 0;
  let fpRows = 0;
  secs.forEach((sec) => {
    if (sec.type === 'exceptions') pageRows += (sec.rows || []).length;
    if (sec.type === 'features') {
      (sec.items || []).forEach((it) => { fpRows += (it.exceptions || []).length; });
    }
  });
  const total = pageRows + fpRows;
  if (total && total < 3) {
    W(`菜单「${mu.name}」只有 ${total} 条异常场景，至少覆盖网络、接口失败、数据为空三类`);
  }
  if (total >= 3 && pageRows === 0) {
    W(`菜单「${mu.name}」的异常全挂在功能点上，页面级一条没有——断网、无权限这类跨功能点的异常没地方放`);
  }
});

/* 5. 交互元素覆盖率 */
let totalInteractive = 0;
let tagged = 0;
Object.keys(pageHtml).forEach((id) => {
  const re = /<(button|input|select|textarea)\b[^>]*>/g;
  let x;
  while ((x = re.exec(pageHtml[id]))) {
    const tag = x[0];
    if (/\btype="(hidden|checkbox|radio)"/i.test(tag)) continue;
    if (/\b(disabled|readonly)\b/i.test(tag)) continue;
    totalInteractive++;
    if (/data-fp=/.test(tag)) tagged++;
  }
});
if (data.platform === 'mobile') {
  P('移动端以 div 承载点击区域，跳过控件覆盖率统计（已通过编号双向核对）');
} else if (totalInteractive > 0) {
  const rate = Math.round((tagged / totalInteractive) * 100);
  const msg = `原型里 ${totalInteractive} 个可操作控件，${tagged} 个挂了编号（${rate}%）`;
  if (rate < 35) W(msg + '，关键按钮和输入项建议都挂上编号，否则研发只能靠猜');
  else P(msg + '（同类控件只需标一次，比例偏低属正常）');
}

/* ---------------- 输出 ---------------- */
const rel = path.relative(process.cwd(), file) || file;
console.log('');
console.log(`PagePrd 交付前检查  ·  ${rel}`);
console.log(`系统：${data.system || '未命名'}（${data.platform === 'mobile' ? '移动端' : 'Web'}）`);
console.log('─'.repeat(52));

if (passes.length) {
  console.log('\n通过');
  passes.forEach((p) => console.log('  ✓ ' + p));
}
if (warns.length) {
  console.log('\n警告（不阻断交付）');
  warns.forEach((w) => console.log('  ⚠ ' + w));
}
if (errors.length) {
  console.log('\n错误（必须修）');
  errors.forEach((e) => console.log('  ✖ ' + e));
}

console.log('─'.repeat(52));
console.log(`结果：${errors.length} 个错误，${warns.length} 个警告\n`);
process.exit(errors.length ? 1 : 0);
