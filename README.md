# Paper Reader V0.1

独立的 Next.js、React 和 PDF.js 阅读工作台。内置一篇三页的虚构教学论文及五组双模式预设解读。

## 本地运行

安装 Node.js 22 或更新版本和 pnpm，然后在项目目录运行。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的本地地址，通常是 http://localhost:3000。生产环境可运行 `pnpm build`，再运行 `pnpm start`。启动开发服务和构建时会自动复制本地 PDF.js Worker。

## 体验路径

1. 滚动 PDF，观察原文高亮、右侧笔记和固定阅读重点。
2. 点击笔记卡顶部的原文定位按钮，或使用页码选择器。
3. 展开精读查看每段原文及解读。切换阅读模式，检查 PDF 位置是否保持。
4. 在某组填写个人笔记。刷新后展开该组即可恢复。记录保存在同一浏览器和站点地址下。
5. 使用缩放按钮、拖动分隔线或交换分栏。分隔线支持左右方向键。

`app/paper.json` 包含论文内容及预设解读，`app/anchors.json` 包含对应的归一化坐标。使用安装了 ReportLab 的 Python 运行 `python3 scripts/sample.py` 可同步重新生成 PDF 和锚点。

后续范围包括真实 AI、PDF 导入和自动解析、论文库、笔记导出和跨设备同步。

## GitHub Pages

将项目推送到独立仓库的 `main` 分支。在仓库的 Settings → Pages 中将发布来源设为 GitHub Actions，然后在 Actions 中运行 Publish GitHub Pages。工作流会根据站点地址设置资源路径，并发布静态导出的 `out` 目录。线上地址与本地地址各自保存个人笔记。
