# 移动端原型规范

适用：微信小程序、H5、App 内的页面。
产物同样是单个 HTML，但左侧原型区是一个 **375 × 812 的手机外框**，右侧说明区结构与 Web 端完全一致。

---

## 1. 模块 = 一个 tab，屏 = 模块内的页面

这是移动端和 Web 端最大的结构差异，必须理解对。

```
一个 .page[data-menu]  ←→  一个底部 tab（首页 / 订单 / 我的…）
  └── 多个 .screen[data-screen]  ←→  该 tab 下的各个页面（列表 / 详情 / 表单）
```

- 点 tabbar 切换 `.page`，**右侧说明跟着换**（因为换模块了）。
- 点列表进详情切 `.screen`，**右侧说明不动**（还是同一个模块的需求）。
  这跟真实产品一致：研发看"订单"这个模块的说明时，不需要在列表和详情之间来回跳文档。
- 切回某个 tab 时，自动回到该模块的第一个屏。

**不要**把订单详情单独做成一个 tab。二级页面就该待在它所属的模块里。

---

## 2. 骨架

```html
<div class="page" data-menu="<模块id>">
  <div class="phone">
    <div class="notch"></div>
    <div class="statusbar"><span>9:41</span><span class="right">▮▮▮ ⌾ ▰</span></div>

    <div class="phone-body">
      <!-- 屏 1 -->
      <div class="screen active" data-screen="list">
        <!-- 页面内容 -->
      </div>
      <!-- 屏 2：二级页面 -->
      <div class="screen" data-screen="detail">
        <div class="navbar">
          <div class="back" data-screen-go="list">‹</div>
          <div class="ttl">详情</div>
          <div class="rt"></div>
        </div>
        <!-- 详情内容 -->
      </div>
    </div>

    <div class="tabbar">
      <div class="tab active" data-menu-btn="home"><span class="ic">⌂</span>首页</div>
      <div class="tab" data-menu-btn="orders"><span class="ic">▤</span>订单</div>
      <div class="tab" data-menu-btn="cart"><span class="ic">▢</span>购物车<span class="badge">2</span></div>
      <div class="tab" data-menu-btn="me"><span class="ic">◔</span>我的</div>
    </div>
  </div>
</div>
```

跳转写法：

```html
<div class="m-shop" data-fp="3" data-screen-go="detail">…</div>   <!-- 列表 → 详情 -->
<div class="back" data-screen-go="list">‹</div>                     <!-- 详情 → 列表 -->
```

`data-screen-go` 的值是目标屏的 `data-screen`。引擎会自动切屏并回到顶部。

**tabbar 的 4 个 tab 在每个 `.page` 里都要写一遍**（各自标 `.active`），因为每块原型是独立的完整界面。
这是有意的冗余——复制粘贴比共享导航更不容易出错。

---

## 3. 可用组件

| 组件 | class | 用途 |
|---|---|---|
| 状态栏 | `.statusbar` + `.notch` | 手机顶部，固定 42px |
| 导航栏 | `.navbar` + `.back` + `.ttl` + `.rt` | 二级页面顶部，带返回 |
| 底部 tab | `.tabbar` + `.tab` + `.badge` | 模块切换，固定 56px |
| 搜索框 | `.m-search` > `.box` | 首页顶部，只读占位 |
| Banner | `.m-banner` > `.txt` | 运营位，112px 高 |
| 分类入口 | `.m-cats` > `.m-cat` > `.ci` | 一行 4 个 |
| 商家卡片 | `.m-shop` > `.ph` + `.info` | 图片 62×62 |
| 门店头图 | `.sd-hero` | 店铺详情顶部，132px |
| 分类页签 | `.sd-tabs` / `.otabs` | 吸顶，可点击 |
| 商品行 | `.dish` > `.ph` + `.info` + `.stepper` | 带加减 |
| 底部结算条 | `.cart-bar` > `.cnt` + `.go` | 吸底，54px |
| 订单卡片 | `.ocard` > `.oh` + `.oitems` + `.of` | 订单列表 |
| 购物车行 | `.citem` | 带步进器 |
| 金额明细 | `.amt-row` > `.l` | 逐行金额 |
| 个人中心头部 | `.me-head` + `.me-card` | 渐变背景 + 数据卡 |
| 列表行 | `.me-list` > `.me-row` | 设置类入口 |
| 小按钮 | `.sbtn` / `.sbtn.primary` | 卡片内操作 |

步进器：`.stepper` > `.m`（减）/ `.n`（数量）/ `.m.fill`（加）。

---

## 4. 尺寸硬约束

- 外框固定 **375 × 812**，圆角 40px，边框 10px。改动会破坏视觉比例。
- 内容区宽度 375，左右内边距 **14px** 是基准。卡片之间间距 10px。
- 可点区域最小 **44 × 44**（Apple HIG 口径）。列表行高度不低于 48px。
- 正文字号 13~14px，辅助信息 11~11.5px，**不要小于 11px**。
- 底部 tabbar 56px，状态栏 42px，二级页导航栏 44px。
- `.phone-body` 内滚动，不出现横向滚动。

---

## 5. 高保真要求

移动端的"真"体现在细节：

1. **状态栏要有**（时间 9:41、信号电量）。少了它一眼假。
2. **数据贴行业。** 做校园外卖就写"计算机学院 · 2023 级""二食堂""月售 1240"；
   做医院点餐就写"住院部 12 楼 · 3 床""糖尿病餐"。
3. **金额带小数、带单位**，`¥20.5` 不写 `20.5`。
4. **按钮文案是动作**："去结算""立即支付""再来一单"，不写"确定""提交"。
5. **有状态区分**：待付款红、待取餐蓝、已完成灰。同一个列表里要能看到不同状态。
6. **角标该有就有**：购物车数量、未读消息。

**不要做：**

- 不要在手机框里塞 PC 端的东西（表格、多列布局、hover 效果）。
- **不要用 emoji 或几何字符（◈◇◆▣⌂▢◔）当图标**，用内置 SVG 图标库，见 `spec-common.md` §9。
- 不要一屏塞 8 个模块，真实 App 一屏 3~5 个区块就满了。
- 不要给每个列表项都挂编号。

---

## 6. 编号怎么挂

移动端屏幕窄、元素小，编号最容易出问题。规则比 Web 端更严：

1. **一个功能点只标一次**。4 个分类图标只标第一个，3 张商家卡片只标第一张。
2. **挂在有右侧余量的控件上**：按钮、步进器、输入框、卡片整块。
3. **不要挂在这几类元素上**（会被裁或被内容顶住）：
   - 全宽容器：`.otabs`、`.cart-bar`、`.me-head`、`.navbar`
   - 贴右边缘的裸文字：`.navbar .rt`（管理模式）、`.me-row` 的箭头行
   - 21px 的小圆点：`.stepper .m`（气泡会盖住整个按钮）
4. 挂在列表组上比挂在单行上好：`.me-list`（3 行）优于 `.me-row`（1 行）。
5. 局部微调用 `data-fp-side`：

```html
<div class="me-head" data-fp="14" data-fp-side="in">
```

引擎会自动判断四边空间并翻转；`data-fp-side` 是手动兜底，写了就优先。
详细规则见 `spec-common.md` §4。

### 已经踩过的坑

| 现象 | 原因 | 修法 |
|---|---|---|
| 顶部分栏上的气泡缺个口 | `.otabs` / `.sd-tabs` 是 `sticky top:0`，气泡向上溢出被裁 | 容器加 `padding-top:10px` |
| 气泡压在「管理」的「理」字上 | 挂在 `.navbar .rt`，`right:-9` 压住文字右半 | `.rt` 加 `padding-right:12px` |
| 气泡盖住列表右箭头 `›` | 挂在 `.me-row`，箭头就在最右 | `.me-row` 加 `padding-right:26px`，或改挂 `.me-list` |
| 气泡盖住数据卡的数字 | 挂在 `.it` 单格，数字占满整格 | 改挂 `.me-card` 整卡 |
| **气泡只剩一个缺角的小块** | **容器带 `overflow:hidden`（通常是为了做圆角）** | **去掉该容器的 `overflow:hidden`；若不能去掉，把编号挂到不带裁剪的祖先上** |

### 特别注意：为了圆角加的 overflow:hidden

移动端卡片习惯写 `border-radius:10px; overflow:hidden`，这个组合会把子元素里的绝对定位气泡裁掉。
如果卡片本身没有背景图、内部行也没有独立背景色，`overflow:hidden` 其实是多余的，直接删掉即可：

```css
/* 改前：气泡会被裁 */
.me-list{background:#fff;margin:10px 14px;border-radius:10px;overflow:hidden}

/* 改后：圆角保持，气泡完整 */
.me-list{background:#fff;margin:10px 14px;border-radius:10px}
```

引擎有兜底：`placeBubbles()` 会检测每个气泡是否超出某个 `overflow != visible` 的祖先，
超出就自动收进元素内侧（半透明）。但这是补救，**能去掉裁剪就别依赖兜底** —— 内侧定位会压住内容。

---

## 7. 右侧说明的写法差异

结构完全复用 `spec-common.md`，但内容口径要贴移动端：

- **页面路径**写小程序路由（`/pages/home/index`）或 H5 路径，不写后台菜单路径。
- **面向角色**写"已登录的在校学生、教职工"，而不是"销售专员"。
- **字段表**多用 `form-add` / `form-edit`，因为移动端表单校验规则是重点。
- **业务规则**要写清手势与反馈：上拉加载、下拉刷新、点击防抖、断网提示。
- **状态流转**写清页面级状态：待付款 → 待取餐 → 已完成。
- **布局说明**的 `k` 按移动端习惯：页面顶部 / 页面主体 / 空状态 / **底部 tabbar** / 刷新机制。
- **交互说明**优先写移动端特有的形态：底部抽屉（Bottom Sheet）、全屏二级页右滑推入、Toast，
  少用 Web 那套居中模态弹窗。`anim` 要写出滑动方向与缓动（`cubic-bezier .32,.72,0,1`）。
- **异常场景**分两级：功能点自己的（支付超时、取餐码加载失败、库存不足）挂在
  `features.items[].exceptions`；整页通用的（定位被拒、断网、版本过低、未登录）留在页面级章节。
  移动端四条高频路径必须覆盖：**定位失败 / 断网 / 权限拒绝 / 接口超时**。
- **每个 tab 页都要有布局说明、交互说明、异常场景三件套**，纯展示页也不例外。

---

## 8. 自检

```bash
node scripts/validate.mjs prototypes/<系统名>/index-mobile.html
```

移动端不校验控件覆盖率（大量点击区域由 div 承载），只做编号双向核对。
0 错误即可交付。警告里出现"这 N 个页面没有交互说明 / 没有异常场景"时，**补齐再交**——
用户翻到空页面会认为功能没做，而不是"这页恰好没有"。
