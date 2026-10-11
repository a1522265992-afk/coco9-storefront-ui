# 本地部署优先：Coco9 Editorial 独立商城

本项目先在自己的电脑 localhost 运行，确认前端、数据库和订单后台，再考虑 Cloudflare 云端部署。

## 前提

- Windows / macOS / Linux
- Git
- Node.js 22 LTS（建议；Node 20+ 可尝试）
- 网络可安装 npm 依赖（Wrangler）
- 不需要域名、Cloudflare 账户或上游 API。

当前 PR 尚未合并 main，需检出功能分支。命令在 PowerShell、Windows Terminal、macOS Terminal 和 Linux shell 均可逐行执行。

## 获取当前开发代码

git clone -b feat/editorial-manual-orders-mvp https://github.com/a1522265992-afk/coco9-storefront-ui.git

cd coco9-storefront-ui

npm install

## 最快预览（无需后端）

npm start

打开 http://127.0.0.1:5173 。此模式仅展示杂志极简前端和演示商品，订单 API/后台不起作用。Ctrl+C 停止。

## 完整本地运行（Cloudflare D1 模拟）

先停止 npm start，然后在同一个项目根目录依次执行：

npm run build:shop

npm run setup:local

npm run db:local:init

npm run dev:full

打开 http://127.0.0.1:8788 。

商家后台：http://127.0.0.1:8788/admin.html

第 2 个命令会生成 .dev.vars，内含 64 位十六进制随机管理令牌。它被 .gitignore 排除，不得提交 GitHub，也不要向任何人发送。打开该文件，复制 ADMIN_TOKEN= 后面的值，输入商家后台的管理密钥输入框。不要把整行 ADMIN_TOKEN= 前缀也复制进去。

第 3 个命令把 migrations/0001_initial.sql 写入本地数据库。默认数据保存在 .wrangler/state 目录；不会写入真实 Cloudflare 数据库。若重复执行初始化，样例商品不会重复插入。

默认 CHECKOUT_ENABLED=false，仅可查看商品，不能创建新订单；即使启用下单，也没有收款能力，新订单只会是待支付状态。不要向真实客户公开这个本地版本。

如需纯本地测试创建待支付订单，可在 .dev.vars 中将 CHECKOUT_ENABLED=false 改为 CHECKOUT_ENABLED=true，重启 npm run dev:full；不会有真实扣款。不要将测试订单人工标记为真实已收款。

## 本地验证清单

- 首页雪山背景和商品卡片正常展示。
- 点击商品弹窗，提示当前尚未开放下单。
- 查询订单页面正常加载。
- 访问 /api/catalog 能返回演示商品的 JSON，且不包含上游供货成本。
- /admin.html 输入本地随机管理令牌能读取订单。
- 未提供令牌访问 /api/admin/orders 应返回 401。
- npm test 和 npm run build:shop 正常完成。

## 常见问题

- 找不到 npm：安装 Node.js 后重启终端。
- 找不到 git：安装 Git 后重启终端。
- 找不到 wrangler：确认已执行 npm install，并在项目根目录执行 npm run dev:full。
- DB not configured：不要用 npm start 来测试数据库；使用 db:local:init 和 dev:full。
- 数据库缺表：在项目根目录重新执行 npm run db:local:init，再重启 dev:full。
- EADDRINUSE：关闭之前的预览/测试服务，再启动。
- UI 只显示演示商品：正常。真实商品、供货价、售后说明还没配置。
- 本地用的是 127.0.0.1，仅对你自己的电脑可用，不能作为正式公网网站。

官方文档：
https://developers.cloudflare.com/pages/functions/local-development/
https://developers.cloudflare.com/d1/best-practices/local-development/

## 后续上云

本地完整验证通过后，才创建真实 D1 数据库、在 Cloudflare 绑定正式 DB 和秘密变量、增加合规的支付流程、完善售后和隐私政策；上线前保持收款/下单关闭。具体云部署步骤见 SHOP_SETUP.md。
