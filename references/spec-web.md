# Web 端原型规范

适用：PC 浏览器打开的管理后台、官网、门户、登录页、数据看板。
不适用：需要手机形态展示的页面 → 走 `spec-mobile.md` 和 `template-mobile.html`。

---

## 1. 先选布局，再动手

一个菜单对应一个 `.page`，每个 `.page` 里是一个完整的 `.win`（浏览器窗口外壳）。
不同菜单可以用不同布局，同一菜单内保持一致。

| 布局 | class | 什么时候用 | 典型页面 |
|---|---|---|---|
| **admin** | `.lay-admin` | 有左侧导航、需要登录、以表格和表单为主 | 后台管理、运营系统、CRM、进销存 |
| **portal** | `.lay-portal` | 面向外部用户、顶部导航、内容驱动 | 官网首页、产品页、解决方案页、帮助中心 |
| **plain** | `.lay-plain` | 没有导航、单卡片居中 | 登录、注册、找回密码、扫码结果页 |

判断口径只有一句：**这个页面在真实产品里长什么样，就选哪个。** 不要因为"我们是 B 端系统"
就把官网也套上侧边栏。

---

## 2. 骨架

### 2.1 admin

```html
<div class="page" data-menu="<菜单id>">
  <div class="win">
    <div class="win-bar">
      <i class="win-dot"></i><i class="win-dot"></i><i class="win-dot"></i>
      <div class="win-url">https://xxx.com/<路径></div>
    </div>
    <div class="win-body">
      <div class="lay-admin">
        <aside class="ad-side">
          <div class="ad-logo"><i>首</i>系统名</div>
          <nav class="ad-nav">
            <div class="ad-group">分组名</div>
            <div class="ad-item active" data-menu-btn="<菜单id>"><span class="ico">◈</span>菜单名</div>
            <div class="ad-item"><span class="ico">◇</span>其他菜单</div>
          </nav>
        </aside>
        <div class="ad-main">
          <div class="ad-top">
            <div class="ad-crumb">一级 / <b>当前页</b></div>
            <div class="ad-user"><span class="ad-avatar">李</span>李明 · 角色</div>
          </div>
          <div class="ad-content">
            <!-- 工具栏 + 表格 -->
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

**注意**：`data-menu-btn` 挂在 `.ad-item` 上，点了就切右侧说明。当前项加 `.active`。
只有"有说明的菜单"才加 `data-menu-btn`，其他菜单项留作视觉占位，不加这个属性。

### 2.2 portal

```html
<div class="lay-portal">
  <div class="pt-nav">
    <div class="pt-logo">品牌<i>产品名</i></div>
    <div class="pt-links">
      <a class="active" data-menu-btn="<菜单id>">产品</a>
      <a>解决方案</a><a>价格</a>
    </div>
    <button class="btn-ghost" data-fp="5">登录</button>
    <button class="btn-primary" data-fp="6">免费试用</button>
  </div>
  <div class="pt-hero">
    <h1>主标题</h1><p>副标题</p>
    <div class="pt-cta">…</div>
  </div>
  <div class="pt-sec">
    <h2>区块标题</h2><p class="sub">区块副标题</p>
    <div class="pt-grid"><div class="pt-card" data-fp="8">…</div></div>
  </div>
  <div class="pt-foot">版权信息</div>
</div>
```

`.pt-grid` 是 3 列卡片。要 2 列或 4 列就改 `grid-template-columns`。

### 2.3 plain

```html
<div class="lay-plain">
  <div class="pl-card">
    <h1>登录</h1><p class="sub">副标题</p>
    <div class="pl-item"><label>手机号</label><input class="input" data-fp="9"></div>
    <div class="pl-item"><label>密码</label><input class="input" type="password" data-fp="9"></div>
    <button class="pl-submit" data-fp="10">登 录</button>
    <div class="pl-foot">辅助说明</div>
  </div>
</div>
```

---

## 3. 可用组件

模板里已经写好，直接抄 class：

**容器**：`.panel` + `.panel-head` + `.panel-title` + `.panel-body`（白底卡片）
**工具栏**：`.toolbar` + `.field` + `.input` / `.select` + `.btn-primary` / `.btn-ghost` / `.btn-danger`
**表格**：`.tbl` + `thead th` + `tbody td`，强调列加 `td.strong`
**标签**：`.tag` + `.tag-blue` / `.tag-green` / `.tag-amber` / `.tag-gray` / `.tag-red`
**分页**：`.pager` + `<b>`，当前页加 `.cur`
**弹窗**：`.mask.show` > `.modal` > `.modal-head` / `.modal-body` / `.modal-foot`
**表单**：`.form-grid` + `.it`，整行加 `.full`，必填标记 `<span class="req">*</span>`
**文本链接**：`.link`

按钮尺寸统一 30px 高，输入框 30px 高，表格行 40px 左右。不要临时写行内宽度把节奏打乱。

---

## 4. 高保真到底"高"在哪

原型不是线框图。研发和业务方要能一眼看出这是他们熟悉的东西。

**必须做到的：**

1. **数据是真实的，不是 Lorem。** 用行业里真实感的名称：
   - 制造业：「华东区仓储升级项目」「苏州工厂 MES 对接」
   - 医疗：「宁波医疗器械集采」
   - 餐饮：「杭州连锁餐饮采购」
   - 教育：「计算机学院 · 2023 级」
2. **数值有量级感。** 金额带两位小数，数量级合理，"共 128 条"而不是"共 3 条"。
3. **状态颜色有语义。** 红色=异常/待处理，绿色=完成，蓝色=进行中，灰色=失效。
4. **空状态、异常态该有就有。** 至少留一处「暂无数据」或「加载失败」的示例。
5. **字段名用业务语言。** 写"线索名称"不写"名称"，写"负责人"不写"用户ID"。

**不要做的：**

- **不要用 emoji 或几何字符（◈ ◇ ◆ ▣）当图标**，用内置 SVG 图标库，见 `spec-common.md` §9。
- 不要写"这里是标题"、"内容区域"这类占位文案。
- 不要把每个元素都挂编号。
- 不要为了塞更多内容把字号压到 12px 以下。

---

## 5. 弹窗怎么处理

弹窗放在 `.page` 内部，用 `.mask.show` 控制显隐。默认不显示。

```html
<div class="mask" id="modal-lead">
  <div class="modal">
    <div class="modal-head">录入线索 <span class="x" onclick="document.getElementById('modal-lead').classList.remove('show')">×</span></div>
    <div class="modal-body">…</div>
    <div class="modal-foot">
      <button class="btn-ghost" onclick="…remove('show')">取消</button>
      <button class="btn-primary">保存</button>
    </div>
  </div>
</div>
```

触发按钮写 `onclick="document.getElementById('modal-lead').classList.add('show')"`。
`.mask` 是 `position:fixed`，会盖住整个视口——包括右侧说明区。这是刻意的：
弹窗本来就是模态的，研发需要看到遮挡关系。演示时关掉即可。

**弹窗字段也要进说明表的 `form-add`，字段名必须和弹窗里的一致。**

**原型里出现的每个弹窗 / 抽屉 / 下拉面板，右侧必须有一条 `interactions` 对应**，
六字段齐全（面板名称 / 触发方式 / 面板内容 / 关闭方式 / 展现形式 / 动画效果）。
PC 端 `form` 一般写"居中模态弹窗，宽 N，圆角 N，遮罩 N% 黑"；`anim` 写清淡入时长与位移，
不要只写"有动画"。**每个菜单都要有交互说明**，哪怕是官网首页——`预约演示` 弹窗、
移动端导航抽屉都属于这一页的交互。

---

## 6. 尺寸与响应

- 原型画布 `.win` 最大宽度 1320px，居中，外层留 26px 边距。
- `.win-body` 高度自适应内容，最高 `calc(100vh - 208px)`，超出滚动。
- 右侧说明区默认 468px，1400px 以下收窄到 410px，1180px 以下 360px。
- 不要在原型里写死 `width: 1920px` 这类绝对宽度。
- 表格列用 `width` 或内容自适应，总宽别超出容器。

---

## 7. 自检

生成完跑一次：

```bash
node scripts/validate.mjs prototypes/<系统名>/index-web.html
```

0 错误才算完成。警告逐条看，能修就修。出现"这 N 个页面没有交互说明 / 没有异常场景"时
**必须补**——PC 端的权限不足、接口失败、重复提交是最常被研发追问的三类，留空等于没写需求。

异常分两级：单个功能点自己的（查重失败、导入格式错误、字段校验）下沉到
`features.items[].exceptions`；整页通用的（断网、无权限、浏览器过低）留在页面级章节。
