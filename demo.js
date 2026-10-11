import {renderStorefront, renderProduct} from './src/index.js';
import {escapeHTML as e} from './src/shared.js';
import {bindNavigation} from './src/navigation.js';

const main = document.querySelector('#main');
const dialog = document.querySelector('#detail');
const notice = document.querySelector('#store-notice');
const demoProducts = [
  {id:'sample-ai',title:'数字工具服务 · 展示样例',category:'数字工具',description:'演示商品，不构成真实报价或交付承诺。',priceCents:3999},
  {id:'sample-help',title:'数字服务套餐 · 展示样例',category:'数字生活',description:'实际可售商品和价格将在正式上架后公布。',priceCents:9900}
];
let products = demoProducts;
let checkoutEnabled = false;
let apiReady = false;
const money = n => '¥' + (Number(n) / 100).toFixed(2);

function errorText(err) { return err instanceof Error ? err.message : '网络异常'; }
async function loadCatalog() {
  try {
    const response = await fetch('/api/catalog', {cache:'no-store'});
    if (!response.ok) throw new Error('商品接口尚未就绪');
    const data = await response.json();
    if (!Array.isArray(data.products)) throw new Error('商品数据异常');
    products = data.products;
    checkoutEnabled = data.checkoutEnabled === true;
    apiReady = true;
    notice.textContent = checkoutEnabled
      ? '人工处理订单 · 下单后请等待独立核实收款，不承诺即时发货'
      : '筹备中的商店 · 暂未开放下单和付款';
  } catch {
    products = demoProducts;
    checkoutEnabled = false;
    apiReady = false;
    notice.textContent = '静态预览模式 · 以下为演示商品，不支持下单或付款';
  }
  route();
}
function categories() {
  return [...new Set(products.map(p => p.category))].filter(Boolean)
    .map((name,i) => ({id: String(i),name}));
}
function showShop() {
  const cats = categories();
  main.innerHTML = renderStorefront({
    template:'editorial', brand:'AI 数字服务', assetBase:'./src/assets',
    heroTitle:'探索数字工具，\n让灵感继续生长。',
    categories:cats
  });
  const search = main.querySelector('.search');
  let category = '';
  const render = () => {
    const term = (search?.value || '').trim().toLowerCase();
    const list = products.filter(p =>
      (!category || cats[Number(category)].name === p.category) &&
      (p.title + ' ' + p.description).toLowerCase().includes(term)
    );
    main.querySelector('.products').innerHTML = list.length
      ? list.map((p,i) => renderProduct({
        name:p.title, description:p.description, category:p.category,
        price:money(p.priceCents), href:'#/product/' + encodeURIComponent(p.id)
      },'editorial',i)).join('')
      : '<div class="empty"><h2>暂无相关商品</h2><p>试试其他关键词。</p></div>';
    main.querySelector('[data-catalog-count]').textContent = list.length + ' 件商品';
  };
  if (search) search.addEventListener('input',render);
  main.querySelectorAll('[data-category]').forEach(btn => btn.addEventListener('click',() => {
    category = btn.dataset.category;
    main.querySelectorAll('[data-category]').forEach(node => {
      node.classList.toggle('active',node === btn);
      node.setAttribute('aria-pressed',String(node === btn));
    });
    render();
  }));
  main.querySelectorAll('[data-catalog-jump]').forEach(btn => btn.addEventListener('click',()=>{
    main.querySelector('[data-catalog]')?.scrollIntoView({behavior:'smooth'});
  }));
  render();
}
function openProduct(rawId) {
  const id = decodeURIComponent(rawId);
  const product = products.find(p => p.id === id);
  if (!product) { location.hash = '#/shop'; return; }
  const enabled = checkoutEnabled && apiReady;
  document.querySelector('#detail-content').innerHTML =
    '<h2 id="detail-title">' + e(product.title) + '</h2>' +
    '<p>' + e(product.description) + '</p>' +
    '<p><strong>' + e(money(product.priceCents)) + '</strong></p>' +
    '<p class="shop-muted">人工采购交付，请勿提交任何账号密码、登录验证码或 API 密钥。</p>' +
    (enabled
      ? '<form id="order-form"><label>联系邮箱（用于订单售后）<input type="email" name="email" autocomplete="email" maxlength="254" required placeholder="you@example.com"></label><button type="submit">提交待付款订单</button><p class="shop-muted">提交订单不代表付款成功；请等待正式付款指引。</p></form>'
      : '<p class="shop-warning">当前仅开放预览，尚不支持下单或收款。</p>') +
    '<p id="order-feedback" role="status" aria-live="polite"></p>';
  if (!dialog.open) dialog.showModal();
  const form = document.querySelector('#order-form');
  if (form) form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    const feedback = document.querySelector('#order-feedback');
    button.disabled = true;
    try {
      const response = await fetch('/api/orders',{
        method:'POST',headers:{'content-type':'application/json'},
        body:JSON.stringify({productId:product.id,email:form.elements.email.value})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '订单提交失败');
      localStorage.setItem('shop-last-order',JSON.stringify({id:data.order.id,token:data.accessToken}));
      dialog.close();
      location.hash = '#/orders';
    } catch (err) {
      feedback.textContent = errorText(err);
      button.disabled = false;
    }
  });
}
function orderPage() {
  let last = {};
  try { last = JSON.parse(localStorage.getItem('shop-last-order') || '{}') || {}; } catch {}
  main.innerHTML = '<section class="shop-page"><p class="eyebrow">ORDER LOOKUP</p><h1>查询订单</h1>' +
    '<p class="shop-muted">请保管订单号和订单查询凭证。订单号本身不足以读取订单。</p>' +
    '<form id="lookup-form" class="shop-form">' +
    '<label>订单号<input name="id" required autocomplete="off" value="' + e(last.id || '') + '"></label>' +
    '<label>查询凭证<input name="token" required autocomplete="off" value="' + e(last.token || '') + '"></label>' +
    '<button type="submit">查询进度</button></form><div id="lookup-result" role="status"></div></section>';
  const form = main.querySelector('#lookup-form');
  form.addEventListener('submit',async event => {
    event.preventDefault();
    const result = main.querySelector('#lookup-result');
    const id = form.elements.id.value.trim();
    const token = form.elements.token.value.trim();
    if (!/^[a-f0-9-]{36}$/.test(id)) { result.textContent = '订单号格式不正确'; return; }
    result.textContent = '正在查询…';
    try {
      const response = await fetch('/api/orders/'+encodeURIComponent(id),{
        headers:{'x-order-token':token},cache:'no-store'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '无法查询订单');
      const order = data.order;
      const labels = {awaiting_payment:'待支付（尚未确认收款）',paid:'已确认收款',processing:'处理中',fulfilled:'已交付',cancelled:'已取消',refunded:'已退款'};
      result.innerHTML = '<section class="shop-order-result"><h2>' + e(order.productName) + '</h2>' +
        '<p>订单状态：<strong>' + e(labels[order.status] || order.status) + '</strong></p>' +
        '<p>订单金额：' + e(money(order.amountCents)) + '</p>' +
        (order.deliveryMessage ? '<p>交付说明：' + e(order.deliveryMessage) + '</p>' : '') +
        '<p class="shop-muted">如需帮助，请联系店铺客服并提供订单号，不要公开查询凭证。</p></section>';
    } catch (err) { result.textContent = errorText(err); }
  });
}
function infoPage(kind) {
  const support = kind === 'support';
  main.innerHTML = '<section class="shop-page"><p class="eyebrow">' + (support?'SUPPORT':'ABOUT') + '</p>' +
    '<h1>' + (support?'帮助与售后':'关于本店') + '</h1>' +
    '<p>本店为独立经营的数字服务商店，并非第三方品牌或服务的官方商城。</p>' +
    '<p>商品、实际交付方式、预计人工处理时间及退款规则将在正式开放交易前逐项公布。</p>' +
    '<p>不接收客户账户密码、验证码、私钥或 API 密钥。尚未开通在线支付。</p>' +
    '<p><a href="#/shop">返回商品列表 ↗</a></p></section>';
}
function route() {
  if (dialog.open) dialog.close();
  const route = location.hash.slice(2) || 'shop';
  if (route.startsWith('product/')) {
    showShop(); openProduct(route.slice(8)); return;
  }
  if (route === 'orders') return orderPage();
  if (route === 'about' || route === 'support') return infoPage(route);
  showShop();
}
dialog.addEventListener('close',()=>{
  if (location.hash.startsWith('#/product/')) history.replaceState(null,'','#/shop');
});
bindNavigation(document.querySelector('header'));
window.addEventListener('hashchange',route);
loadCatalog();
