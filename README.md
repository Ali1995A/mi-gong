# 迷宫（儿童版）

一个适合 5 岁儿童（不识字也能玩）的粉色系迷宫小游戏：触摸/滑动即可走迷宫，通关后自动升级难度。

## 本地运行

本项目是纯静态网页（无依赖）。任选一种方式启动静态服务器即可：

- Python：`python -m http.server 5173`
- Node：`npx http-server -p 5173`

然后打开：`http://localhost:5173/public/`

## 部署到 Vercel

直接把仓库推到 GitHub 后，在 Vercel Import 即可（无需构建）。`vercel.json` 已配置为静态站点入口 `public/index.html`。

## 交互方式

- 滑动屏幕：上/下/左/右移动
- 屏幕底部方向键：点击移动
- 通过终点（爱心）：进入下一关

