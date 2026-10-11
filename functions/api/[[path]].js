// Cloudflare Pages Function. D1 binding: DB. No upstream or payment credentials on the client.
const statuses = new Set(['awaiting_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded']);
const transitions = {
  awaiting_payment: ['paid', 'cancelled'],
  paid: ['processing', 'refunded'],
  processing: ['fulfilled', 'refunded'],
  fulfilled: [],
  cancelled: [],
  refunded: []
};
function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}
function fail(message, status) { return reply({error: message}, status); }
function safeEqual(a, b) {
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let delta = aa.length ^ bb.length;
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) delta |= (aa[i] || 0) ^ (bb[i] || 0);
  return delta === 0;
}
function authorized(request, env) {
  const secret = env.ADMIN_TOKEN;
  return typeof secret === 'string' && secret.length >= 32 &&
    safeEqual(request.headers.get('authorization') || '', 'Bearer ' + secret);
}
async function bodyOf(request) {
  const text = await request.text();
  if (text.length > 8192) throw new Error('提交内容过长');
  const data = JSON.parse(text);
  if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('提交格式有误');
  return data;
}
function orderPublic(row) {
  return {
    id: row.id, productName: row.product_name, amountCents: row.amount_cents,
    status: row.status, deliveryMessage: row.status === 'fulfilled' ? row.delivery_message : '',
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}
const hexToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2,'0')).join('');

export async function onRequest({request, env}) {
  const path = new URL(request.url).pathname.split('/').filter(Boolean);
  const method = request.method;
  if (!env.DB) return fail('数据库尚未配置，请先完成 D1 绑定', 503);
  try {
    if (path.join('/') === 'api/catalog' && method === 'GET') {
      const {results} = await env.DB.prepare(
        'SELECT id, title, category, description, price_cents AS priceCents FROM products WHERE active = 1 ORDER BY rank, id'
      ).all();
      return reply({products: results || [], checkoutEnabled: env.CHECKOUT_ENABLED === 'true'});
    }
    if (path.join('/') === 'api/orders' && method === 'POST') {
      // By default, no public order intake until merchant intentionally enables it.
      if (env.CHECKOUT_ENABLED !== 'true') return fail('商城暂未开放下单', 503);
      const data = await bodyOf(request);
      if (typeof data.productId !== 'string' || data.productId.length > 80) return fail('请选择有效商品', 400);
      if (typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        return fail('请填写有效联系邮箱', 400);
      const product = await env.DB.prepare(
        'SELECT id, title, price_cents, cost_cents FROM products WHERE id = ? AND active = 1'
      ).bind(data.productId).first();
      if (!product) return fail('商品不存在或已下架', 404);
      if (!Number.isInteger(product.price_cents) || product.price_cents < 1) return fail('商品价格无效', 409);
      const id = crypto.randomUUID();
      const token = hexToken();
      await env.DB.prepare(
        "INSERT INTO orders (id, access_token, product_id, product_name, amount_cents, cost_snapshot_cents, customer_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_payment')"
      ).bind(id, token, product.id, product.title, product.price_cents, product.cost_cents, data.email.trim()).run();
      // No payment integration yet. Never present this order as paid.
      return reply({order: {id, status: 'awaiting_payment', amountCents: product.price_cents, productName: product.title}, accessToken: token}, 201);
    }
    if (path[0] === 'api' && path[1] === 'orders' && path.length === 3 && method === 'GET') {
      if (!/^[0-9a-f-]{36}$/.test(path[2])) return fail('订单不存在', 404);
      const token = request.headers.get('x-order-token') || '';
      if (!/^[a-f0-9]{48}$/.test(token)) return fail('订单查询凭证无效', 403);
      const row = await env.DB.prepare(
        'SELECT id, product_name, amount_cents, status, delivery_message, created_at, updated_at FROM orders WHERE id = ? AND access_token = ?'
      ).bind(path[2], token).first();
      return row ? reply({order: orderPublic(row)}) : fail('订单不存在或凭证无效', 404);
    }
    if (path.slice(0,3).join('/') === 'api/admin/orders') {
      if (!authorized(request, env)) return fail('未授权，请检查管理密钥', 401);
      if (path.length === 3 && method === 'GET') {
        const {results} = await env.DB.prepare(
          'SELECT id, product_name, amount_cents, cost_snapshot_cents, customer_email, status, delivery_message, payment_reference, created_at, updated_at FROM orders ORDER BY created_at DESC LIMIT 100'
        ).all();
        return reply({orders: results || []});
      }
      if (path.length === 4 && method === 'PATCH') {
        const data = await bodyOf(request);
        if (!statuses.has(data.status)) return fail('订单状态无效', 400);
        const row = await env.DB.prepare('SELECT id, status FROM orders WHERE id = ?').bind(path[3]).first();
        if (!row) return fail('订单不存在', 404);
        if (!transitions[row.status].includes(data.status)) return fail('不允许执行该状态变更', 409);
        const reference = typeof data.reference === 'string' ? data.reference.trim() : '';
        const message = typeof data.deliveryMessage === 'string' ? data.deliveryMessage.trim() : '';
        if (data.status === 'paid' && (data.paymentVerified !== true || reference.length < 4 || reference.length > 160))
          return fail('请先独立核实实际到账，并填写支付流水号', 400);
        if (data.status === 'refunded' && (data.refundVerified !== true || reference.length < 4 || reference.length > 160))
          return fail('请先完成退款，并填写退款流水号', 400);
        if (data.status === 'fulfilled' && (message.length < 2 || message.length > 2000))
          return fail('请填写交付说明（不要提交账户密码或密钥）', 400);
        const result = await env.DB.prepare(
          'UPDATE orders SET status = ?, delivery_message = CASE WHEN ? = ? THEN ? ELSE delivery_message END, payment_reference = CASE WHEN ? IN (?, ?) THEN ? ELSE payment_reference END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ?'
        ).bind(data.status, data.status, 'fulfilled', message, data.status, 'paid', 'refunded', reference, path[3], row.status).run();
        if (!result.meta?.changes) return fail('订单已被其他操作更新，请刷新', 409);
        await env.DB.prepare(
          'INSERT INTO order_events (order_id, previous_status, new_status) VALUES (?, ?, ?)'
        ).bind(path[3], row.status, data.status).run();
        return reply({ok: true});
      }
    }
    return fail('接口不存在或请求方式不支持', 404);
  } catch (error) {
    if (error instanceof SyntaxError || ['提交内容过长','提交格式有误'].includes(error.message))
      return fail('请求格式不正确', 400);
    console.error('shop-api-error', error instanceof Error ? error.name : 'unknown');
    return fail('服务暂时不可用，请稍后重试', 500);
  }
}
