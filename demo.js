import {renderStorefront,renderProduct,themes,themeFor} from './src/index.js';
import {escapeHTML as e} from './src/shared.js';
import {bindNavigation} from './src/navigation.js';
const main=document.querySelector('main'),select=document.querySelector('#theme'),dialog=document.querySelector('#detail');
const categories=[{id:'tools',name:'数字工具'},{id:'creation',name:'创作资源'},{id:'life',name:'数字生活'}];
const products=[
 {name:'灵感笔记',category:'数字工具',categoryId:'tools',price:'20.00 USDT',description:'将零散灵感整理成清晰计划。'},
 {name:'写作助手',category:'数字工具',categoryId:'tools',price:'12.00 USDT',description:'从第一行文字开始，表达你的想法。'},
 {name:'创意素材集',category:'创作资源',categoryId:'creation',price:'8.00 USDT',description:'为下一件作品准备好灵感。'},
 {name:'专注时刻',category:'数字生活',categoryId:'life',price:'6.00 USDT',description:'给每一个当下，留一点自己的时间。'}
].map((p,i)=>({...p,id:String(i+1),href:'#/product/'+(i+1)}));
select.innerHTML=themes.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
let saved='minimal';try{saved=localStorage.getItem('demo-theme')||saved}catch{}
let theme=themeFor(new URL(location.href).searchParams.get('theme')||saved);
function apply(){document.body.dataset.template=theme.id;document.body.dataset.design=theme.design;document.querySelector('meta[name=color-scheme]').content=['neon','orbital'].includes(theme.design)?'dark':'light';select.value=theme.id;}
function shop(){
 main.innerHTML=renderStorefront({template:theme.id,brand:'数字商店',categories,assetBase:'./src/assets'});
 const search=main.querySelector('.search');let category='';
 const filter=()=>{const list=products.filter(p=>(!category||p.categoryId===category)&&p.name.includes(search.value.trim()));main.querySelector('.products').innerHTML=list.length?list.map((p,i)=>renderProduct(p,theme.id,i)).join(''):'<div class="empty"><h2>暂无匹配商品</h2><p>试试其他分类或关键词。</p></div>';main.querySelector('[data-catalog-count]').textContent=list.length+' 件商品';};
 search.oninput=filter;main.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;main.querySelectorAll('[data-category]').forEach(n=>{n.classList.toggle('active',n===b);n.setAttribute('aria-pressed',String(n===b))});filter()});
 main.querySelectorAll('[data-catalog-jump]').forEach(b=>b.onclick=()=>{main.querySelector('[data-catalog]').scrollIntoView();search.focus({preventScroll:true})});filter();
}
function route(){
 apply();const route=location.hash.slice(2)||'shop';
 if(route.startsWith('product/')){if(!main.querySelector('.factory-store'))shop();const p=products.find(p=>p.id===route.split('/')[1]);if(!p)return;document.querySelector('#detail-content').innerHTML=`<h2 id="detail-title">${e(p.name)}</h2><p>${e(p.description)}</p><p><strong>${e(p.price)}</strong> / 份</p><p>这是演示数据。生产接入时，请将此入口连接到你的商品详情与购买流程。</p><p>此演示不连接账户、钱包、支付或订单服务。</p>`;if(!dialog.open)dialog.showModal();return;}
 if(dialog.open)dialog.close();
 if(['about','support','orders'].includes(route)){main.innerHTML='<section class="demo-about"><h1>让数字商店，有自己的样子。</h1><p>六套独立构图，共享可访问的商品与搜索组件。这个项目只提供 UI，可以连接你自己的商品、账户和订单系统。</p><p>切换风格只保存到当前浏览器。示例商品、示例价格与详情弹窗均不构成真实交易。</p><p><a href="#/shop">返回商品演示 ↗</a></p></section>';return;}
 shop();
}
select.onchange=()=>{theme=themeFor(select.value);try{localStorage.setItem('demo-theme',theme.id)}catch{}apply();if(location.hash.startsWith('#/product/'))location.hash='/shop';else route()};
dialog.addEventListener('close',()=>{if(location.hash.startsWith('#/product/'))history.replaceState(null,'','#/shop')});
bindNavigation(document.querySelector('header'));window.addEventListener('hashchange',route);route();
