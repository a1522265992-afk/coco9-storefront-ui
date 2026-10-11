# AI 数字服务 · Editorial 手动订单 MVP

这是从 Coco9 UI 改造而成的测试商城，使用 MIT 许可（原始 LICENSE 保留）。首页固定为杂志极简 editorial 主题。原仓库的 preview.html 仍是六套旧主题的离线演示，不是改造后的商城。

## 范围与状态

- 独立商城、商品目录、商品详情、订单查询
- Cloudflare Pages Functions + D1 订单记录
- 商家后台：人工审核实际到账、处理中、交付登记、取消和退款
- 不含收款渠道、不含支付回调、不含自动采购
- 默认关闭下单；CHECKOUT_ENABLED 未设置时只供预览
- 示例商品不能视作真实销售报价，必须更换并核对供货授权

用户不会从本商城跳往上游。手动到上游采购是商家自己的操作。不得要求客户填写登录密码、验证码、密钥等敏感信息。

## 本地预览

安装 Node.js 20+，执行 npm start。

打开 http://127.0.0.1:5173 。本地服务器仅提供静态页面，不运行订单 API，因此会显示演示商品并关闭下单。

可执行 npm test 和 npm run build:shop。

build:shop 输出 dist/ 静态文件，保留原来的 src/assets 和主题文件。目录 functions/ 在 Cloudflare Pages 中单独部署，无需复制进 dist/。

## Cloudflare Pages 部署

1. 在 Cloudflare 创建 Pages 项目，连接当前 GitHub 仓库（建议先合并 PR）。
2. Framework preset: None；Build command: npm run build:shop；Output directory: dist；Root directory: 仓库根目录。
3. 创建 D1 数据库，例如 coco9-shop-db。在 D1 控制台 SQL 编辑器中执行 migrations/0001_initial.sql，或使用 Wrangler migrations apply。不要在已有业务库重复执行不兼容迁移。
4. 在 Pages 项目设置的 D1 bindings 创建 DB 绑定，指向步骤 3 的数据库。确保生产和预览环境各自正确绑定。
5. 在 Pages 环境变量 / Secrets 配置 ADMIN_TOKEN，值为安全随机源生成的至少 32 字符秘密（例如用 openssl rand -hex 32）。绝不能提交到 GitHub，也不要与客户分享。
6. 首次部署访问网站和 /api/catalog 检查目录；访问 /admin.html 并输入管理密钥，确认后台能读取订单。
7. CHECKOUT_ENABLED 默认留空。它不是支付开关：即使设为 true，订单也只会是待支付，不会收钱。没有确定并核实合规收款渠道、售后政策和实际到账核验流程前，不要开启真实订单。
8. 完成支付集成和端到端测试后，再考虑开放交易、绑定自有域名。正式上线前还应配置反滥用、速率限制、备份、隐私政策和客服渠道。

## 安全与订单说明

- 客户创建订单时，服务端根据商品 ID 从 D1 读取当前售价并记录快照；不会相信浏览器传来的价格。
- 订单默认为 awaiting_payment，没有自动支付确认。
- 只有凭至少 32 字符 ADMIN_TOKEN 才能访问管理 API；不要在浏览器存储该密钥。建议生产环境额外使用 Cloudflare Access 对 /admin.html 和 /api/admin/* 设置访问策略。
- 将订单标记为 paid 前，商家必须独立在支付服务商核实到账并输入真实流水号；不要相信用户提交的截图。
- 前端“我的订单”使用随机查询凭证，凭证仅保存在该浏览器 localStorage 中。用户应保管并避免分享。
- 手动订单状态：待支付 → 已核实到账 → 处理中 → 已交付。取消及退款为单独分支。
- 后续对接真实支付时，新增支付记录、服务端验签、金额验证、幂等回调和反欺诈。不要依赖客户端“支付成功”按钮。
- 后续上游 API 接入应放在服务端，不得把 API Token 放进 demo.js 或公开仓库。

## 商品修改

目前 migration 仅有两个演示商品。创建 D1 后，在 SQL 编辑器中维护 products 表。先在测试环境核实字段含义，避免把供货成本暴露到 catalog API。

| 字段 | 说明 |
| --- | --- |
| id | 商品唯一 ID |
| title, category, description | 公开展示的字段 |
| price_cents | 售价（人民币分） |
| cost_cents | 参考采购成本（人民币分，仅在后台使用） |
| active | 1 上架，0 下架 |
| rank | 商品排序 |

注意检查商品供应、品牌使用权、转售限制、付款渠道的数字商品政策、客户退款权益以及所面向地区的经营合规要求。
