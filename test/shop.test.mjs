import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/[[path]].js';

const request = (path, method='GET', body, headers={}) => new Request(
  'https://shop.example'+path,
  {method,headers: body ? {'content-type':'application/json',...headers}:headers,
  ...(body ? {body:JSON.stringify(body)} : {})}
);
const mockDB = {
  prepare(sql) {
    return {
      bind(...args) { this.args=args; return this; },
      async all() { return {results: [{id:'p1',title:'example',category:'test',description:'sample',priceCents:1999}]}; },
      async first() { return {id:'p1',title:'example',price_cents:1999,cost_cents:1000}; },
      async run() { return {meta:{changes:1}}; }
    };
  }
};
test('catalog exposes selling price but not purchase cost',async()=>{
  const response=await onRequest({request:request('/api/catalog'),env:{DB:mockDB}});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.checkoutEnabled,false);
  assert.equal(data.products[0].priceCents,1999);
  assert.equal('cost_cents' in data.products[0],false);
});
test('order creation remains disabled by default',async()=>{
  const response=await onRequest({request:request('/api/orders','POST',{productId:'p1',email:'buyer@example.test'}),env:{DB:mockDB}});
  assert.equal(response.status,503);
});
test('admin endpoint cannot work without strong secret',async()=>{
  const response=await onRequest({request:request('/api/admin/orders','GET',null,{authorization:'Bearer bad'}),env:{DB:mockDB,ADMIN_TOKEN:'bad'}});
  assert.equal(response.status,401);
});
test('order creation uses server product and marks unpaid',async()=>{
  const response=await onRequest({request:request('/api/orders','POST',{productId:'p1',email:'buyer@example.test',price_cents:1}),env:{DB:mockDB,CHECKOUT_ENABLED:'true'}});
  assert.equal(response.status,201);
  const {order,accessToken}=await response.json();
  assert.equal(order.amountCents,1999);
  assert.equal(order.status,'awaiting_payment');
  assert.match(accessToken,/^[a-f0-9]{48}$/);
});
