import test from 'node:test';
import assert from 'node:assert/strict';
import {themes, themeFor, renderStorefront, renderProduct} from '../src/index.js';
import {safeImage} from '../src/shared.js';
test('all legacy selections render independent designs and preserve unknown fallback',()=>{
 assert.deepEqual(themes.map(t=>t.id),['minimal','dark-business','card-catalog','compact-list','editorial','playful']);
 for(const t of themes){assert.equal(themeFor(t.id),themeFor(t.design));assert.match(renderStorefront({template:t.id}),new RegExp('design-'+t.design));}
 assert.equal(themeFor('unrecognized').id,'minimal');
});
test('untrusted catalogue text remains text; unsafe links and image URLs are rejected',()=>{
 const html=renderProduct({name:'<script>alert(1)</script>',description:'<img src=x onerror=alert(1)>',href:'javascript:alert(1)',image:'javascript:alert(1)',price:'<b>1</b>'},'minimal');
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('javascript:'));assert.match(html,/&lt;script&gt;/);
 for(const u of ['//evil.test/x','/\\evil.test/x','http://evil.test/x','data:image/png;base64,abc','https://name:secret@example.test/x','https://example.test/ bad'])assert.equal(safeImage(u),'',u);
 assert.equal(safeImage('/product.webp'),'/product.webp');assert.equal(safeImage('https://example.test/p.webp'),'https://example.test/p.webp');
});
