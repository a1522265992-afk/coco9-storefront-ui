const form = document.querySelector('#login');
const panel = document.querySelector('#orders-panel');
const result = document.querySelector('#orders');
const feedback = document.querySelector('#feedback');
let token = '';
const e = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '¥' + (Number(n)/100).toFixed(2);
const labels = {awaiting_payment:'待支付',paid:'已核实到账',processing:'人工处理中',fulfilled:'已交付',cancelled:'已取消',refunded:'已退款'};
async function api(url,options={}) {
  const res = await fetch(url,{...options,headers:{'authorization':'Bearer '+token,'content-type':'application/json'},cache:'no-store'});
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}
const buttons = {
  awaiting_payment:[['paid','独立核实到账'],['cancelled','取消订单']],
  paid:[['processing','开始处理'],['refunded','登记已退款']],
  processing:[['fulfilled','登记交付'],['refunded','登记已退款']]
};
async function load() {
  feedback.textContent = '加载中…';
  try {
    const data = await api('/api/admin/orders');
    panel.hidden = false;
    feedback.textContent = '';
    result.innerHTML = data.orders.length ? data.orders.map(order => {
      const controls = (buttons[order.status] || []).map(([status,label]) =>
        '<button type="button" data-id="'+e(order.id)+'" data-status="'+e(status)+'">'+e(label)+'</button>').join('');
      return '<article class="order"><h3>'+e(order.product_name)+'</h3>' +
        '<p class="muted">订单 '+e(order.id)+' · '+e(order.created_at)+'</p>' +
        '<p>状态：<strong>'+e(labels[order.status] || order.status)+'</strong> · 客户实付 '+e(money(order.amount_cents)) +
        ' · 采购参考成本 '+e(money(order.cost_snapshot_cents))+'</p>' +
        '<p>联系邮箱：'+e(order.customer_email)+'</p>' +
        (order.delivery_message ? '<p>交付结果：'+e(order.delivery_message)+'</p>' : '') +
        '<div class="actions">'+controls+'</div></article>';
    }).join('') : '<p>暂无订单。当前没有真实收款接口。</p>';
  } catch (err) { feedback.textContent = err.message; panel.hidden = true; }
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  token = form.elements.token.value.trim();
  form.elements.token.value = '';
  load();
});
document.querySelector('#reload').addEventListener('click',load);
result.addEventListener('click',async event=>{
  const btn = event.target.closest('button[data-status]');
  if (!btn) return;
  const status = btn.dataset.status;
  const payload = {status};
  if (status === 'paid') {
    const ref = prompt('请先到支付服务商后台独立核实实际到账。输入真实支付流水号：');
    if (!ref) return;
    if (!confirm('确认已经在支付平台核实到账，而非仅凭转账截图？')) return;
    payload.paymentVerified = true; payload.reference = ref;
  } else if (status === 'refunded') {
    const ref = prompt('退款完成后，填写真实退款流水号：');
    if (!ref) return;
    if (!confirm('确认已经实际完成退款？')) return;
    payload.refundVerified = true; payload.reference = ref;
  } else if (status === 'fulfilled') {
    const delivery = prompt('输入可交付给客户的说明（不要填写账号密码、密钥或敏感凭证）：');
    if (!delivery) return;
    payload.deliveryMessage = delivery;
  } else if (!confirm('确认将订单状态更改为「'+labels[status]+'」？')) return;
  btn.disabled = true;
  try {
    await api('/api/admin/orders/'+encodeURIComponent(btn.dataset.id),{method:'PATCH',body:JSON.stringify(payload)});
    await load();
  } catch (err) { feedback.textContent = err.message; btn.disabled = false; }
});
