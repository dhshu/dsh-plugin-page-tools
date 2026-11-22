# 插件列表增强 · dsh-plugin-page-tools

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件页的「已安装插件」分组加上**搜索**、**分页**和**全部更新**：插件装多了不用翻一长条卡片找，检查完更新也能一次装完。

## 功能

- **搜索**：分组标题下有一个搜索框，按卡片标题、简介和包名匹配；大小写不敏感、空白折叠、按空格切词，每个词都要出现才算命中。命中数量（如 `9/25`）显示在搜索框右侧，查询无结果时显示「没有匹配「…」的插件。」。
- **分页**：卡片之后一行**靠右**排列——`第 1–10 条，共 22 条` · `每页 [10] 条` · `« ‹ 1 2 3 › »`。
  - 每页条数默认 10，可填 1–100，回车或失焦生效，记在本机 `localStorage`；
  - 改条数时保持你正在看的那张卡留在屏幕上，不会跳回第一页；
  - 只有一页时隐藏页码按钮，只留总数和每页条数。
- **全部更新**：「刷新」按钮右边多一个「全部更新」按钮，带 `N` 表示有几个插件可更新。点一下就把这几款插件逐个装好，没有多余确认框；失败互不影响，官方失败自动回滚仍然生效，失败的插件同一次会话里不会重复尝试。没有可更新的插件时按钮是禁用态。
- **一个说明用标签页**：插件页顶部会多一个同名标签，里面只有一行说明——「全部更新」要读宿主的版本检查、调用宿主的更新动作，这些只在插件页自己的上下文里，官方约定就是通过贡献一个标签页来拿。功能仍然都在「已安装」里。
- **不会被打断**：官方页面重新渲染卡片（启用 / 停用插件、刷新、切标签）时，搜索词、页码和每页条数都会重新应用。
- **只看「已安装插件」**：官方内置插件、实验性插件两个分组保持原样，不搜也不分页。
- **双语**：文案通过 `ctx.locale` 注册 `zh` 与 `en`，跟随 DSH 界面语言。

## 安装

要求：DSH（桌面版或 Web GUI）及其随附的 `dsh` 命令行工具，Node.js >= 22。插件是纯前端 bundle，没有编译 / 打包步骤。

统一命令是：

```text
dsh plugin --profile <profile> add <包或 Git 地址>
```

`--profile` 决定装进哪个 profile：`web` 对应 Web GUI，`desktop` 对应桌面版（先完全退出 DeepSeek Harness Desktop 再执行）。`add` 之后的参数原样转交给 pnpm，在该 profile 目录内执行。本包声明了 `dsh.bundle.patch`，装好后会自动加入 profile 的 `dsh.profile.bundles`，不需要手改 `package.json` 或 `cordis.patch.yml`。

### 从 GitHub 安装（推荐）

```bash
# 桌面版
dsh plugin --profile desktop add git+https://github.com/dhshu/dsh-plugin-page-tools.git

# Web GUI
dsh plugin --profile web add git+https://github.com/dhshu/dsh-plugin-page-tools.git
```

Windows 上如果 `dsh` 不在 PATH 中，用 DSH 安装目录里的 `dsh.cmd`（`<DSH 安装目录>\resources\runtime\cli\bin\dsh.cmd`）。

**重启 DSH** 或刷新窗口（`Ctrl+R`）后插件才挂载生效。

### 本地目录安装（开发 / 离线）

```bash
git clone https://github.com/dhshu/dsh-plugin-page-tools.git
cd dsh-plugin-page-tools
dsh plugin --profile desktop add .
# 或保留软链接，改代码后立即生效：
dsh plugin --profile desktop add link:<本仓库的绝对路径>
```

`file:` / `link:` 形式也能引用本地副本。本包没有 `scripts` / `prepare`，不会因为 pnpm 阻止 Git 依赖构建脚本而需要额外的 `allowBuilds` 配置。

### 其他方式

- 在 Agent 对话里让工具执行：`plugin_manager install_bundle target=<本仓库的绝对路径>`
- 或在界面里：设置 → 插件 → 添加插件，选这个目录，再刷新窗口。

### 卸载

```bash
dsh plugin --profile desktop remove dsh-plugin-page-tools
```

## 使用

打开 插件 页 → 「已安装插件」分组：标题下搜索，卡片下方一行分页。搜索框按 `Esc` 或点 `×` 清空。

## 数据与持久化

只用一个本机键 `dsh-plugin-page-tools.page-size` 记每页条数；其余状态（搜索词、页码、隐藏哪些卡片）只活在当前页面里。不上传任何数据，也不访问网络。

## 实现要点

- 浏览器半边 `lib/client.js` 只改呈现，不做渲染劫持：官方页面照旧渲染，本插件在「已安装插件」分组（`data-plugin-group="bundles"`）里插入搜索框和分页行，用 `display:none` 收起被查询或页码过滤掉的卡片。
- 用 `MutationObserver` 在页面每次重渲染后重新应用视图；所有写入都是幂等的，不会自己触发自己。
- 宿主半边 `lib/index.js` 是空 `apply()`，不提供服务、工具或配置项。

## 兼容性

- 目标平台是 DSH Web 客户端（`dsh.client.platform = web`），在桌面版验证。
- 依赖官方公开能力：`ctx.slots`、`ctx.locale`，以及插件页固定的 `data-plugin-group` 标记。DSH 大版本升级后如果插件页结构变化，选择和插入逻辑需要跟着调整。

## License

[MIT](LICENSE)。

---

## English

**dsh-plugin-page-tools** — search, pagination and update-all for the Installed group of the DeepSeek Harness Plugins page.

Search the installed plugins by title, description and package name (case-folded, space-separated words must all match), and page the cards with one right-aligned row: `1–10 of 22` · `Per page [10]` · `« ‹ 1 2 3 › »`. The cards per page (1–100, default 10) are remembered in `localStorage`, changing them keeps the card you were reading on screen, and the view survives every re-render of the shipped page. Only the Installed group is affected.

Next to the shipped Refresh button sits **Update all** with a `N` badge for the plugins the manager finds an update for. One click installs each of them in turn without extra dialogs; a failure affects only its own plugin, the shipped rollback still applies, and a failed plugin is not retried in the same page session. The button stays disabled when nothing is pending.

It also contributes one explanatory tab to the Plugins page. A contributed tab is the supported way to be rendered with the page's own context, which is where the Host's version list and update action live; everything else stays in the Installed tab.

Install with the DSH CLI:

```bash
dsh plugin --profile desktop add git+https://github.com/dhshu/dsh-plugin-page-tools.git
```

`--profile` selects the target profile (`web` for the Web GUI, `desktop` for the desktop app — quit the app first). The bundle registers itself through `dsh.bundle.patch`; restart DSH or reload the window afterwards. Local development: `git clone`, then `dsh plugin --profile desktop add link:<absolute path>`.

Pure front end: the Host half is an empty `apply()`, the browser half only changes presentation. zh/en copy through `ctx.locale`. MIT licensed.
