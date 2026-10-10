import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createLaptop} from './model.js';
import {createContactShadow} from './shadow.js';

const stage=document.querySelector('#stage'),status=document.querySelector('#status');
const buttons=[...document.querySelectorAll('.controls button')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let dispose=()=>{};
document.querySelector('#retry').addEventListener('click',()=>safeStart());
function start(){
  dispose();stage.querySelector('canvas')?.remove();document.querySelector('#fallback').hidden=true;document.querySelector('#loading').hidden=false;
  buttons.forEach(b=>b.disabled=true);
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power',preserveDrawingBuffer:true});}catch{fail();return;}
  let disposed=false,raf=0,inView=true,frames=0,dirty=true,drag=null,pointers=new Map(),pinch=null;
  const abort=new AbortController(),signal=abort.signal;
  const scene=new THREE.Scene();
  // Even an initialization error must release its renderer and event listeners.
  dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);abort.abort();renderer.dispose();if(!renderer.getContext().isContextLost())renderer.forceContextLoss();};
  const camera=new THREE.PerspectiveCamera(29,1,.1,60);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setClearColor(0xffffff,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
  stage.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;scene.environmentIntensity=1.1;scene.environmentRotation.y=.45;
  room.dispose();pmrem.dispose();
  const laptop=createLaptop();scene.add(laptop.root);laptop.root.position.y=.10;
  const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-3,6,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:15});key.shadow.bias=-.0006;key.shadow.normalBias=.025;key.shadow.radius=4;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe8efff,.8);fill.position.set(4,2,-3);scene.add(fill);
  const shadow=createContactShadow(renderer,scene);let previousLid=-1;
  const initial={yaw:-.38,pitch:.32,distance:7.9,lid:106};
  const current={...initial},target={...initial};let velocity=0,lastTime=0,shop=false,closed=false,finish='silver',fit=1;
  updateLidButton();document.querySelector('#screen-toggle').setAttribute('aria-pressed','false');document.querySelector('#screen-toggle span').textContent='看看商店';
  for(const b of document.querySelectorAll('[data-finish]'))b.setAttribute('aria-pressed',String(b.dataset.finish==='silver'));document.querySelector('#finish-label').textContent='银色';
  const clamp=THREE.MathUtils.clamp;
  const intersectsViewport=()=>{const r=stage.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>=-80&&r.top<=innerHeight+80&&r.right>=0&&r.left<=innerWidth;};
  // Recheck actual geometry on input: mobile viewport changes can leave an observer entry stale.
  const canRender=()=>{if(disposed||document.hidden)return false;inView=intersectsViewport();return inView;};
  function request(){dirty=true;if(!raf&&canRender())raf=requestAnimationFrame(tick);}
  function syncCamera(){
    const d=current.distance*fit;
    camera.position.set(Math.sin(current.yaw)*Math.cos(current.pitch)*d,1.03+Math.sin(current.pitch)*d,Math.cos(current.yaw)*Math.cos(current.pitch)*d);
    camera.lookAt(0,1.03,0);camera.updateMatrixWorld();laptop.setOpen(current.lid);
    if(Math.abs(current.lid-previousLid)>.01){shadow.update();renderer.shadowMap.needsUpdate=true;previousLid=current.lid;}
    shadow.plane.visible=current.pitch>0;
  }
  function tick(time){
    raf=0;if(!canRender())return;
    const dt=Math.min(.04,(time-lastTime)/1000||.016);lastTime=time;
    if(!drag&&Math.abs(velocity)>.0001&&!reduced.matches){target.yaw+=velocity*dt*60;velocity*=Math.pow(.88,dt*60);}else velocity=0;
    const a=reduced.matches?1:1-Math.exp(-dt*13);let moving=false;
    for(const key of Object.keys(current)){
      const difference=target[key]-current[key];if(Math.abs(difference)>(key==='lid'?.008:.00008)){current[key]+=difference*a;moving=true;}else current[key]=target[key];
    }
    syncCamera();renderer.render(scene,camera);frames++;dirty=false;
    if(moving||Math.abs(velocity)>.0001)request();
  }
  function resize(){
    const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();
    // Keep the whole machine inside narrow mobile viewports without a large layout shift.
    fit=Math.max(1,1.46/camera.aspect);renderer.setSize(w,h,false);request();
  }
  function reset(){Object.assign(target,initial);velocity=0;closed=false;updateLidButton();status.textContent='已恢复默认视角，屏幕已打开';request();}
  function updateLidButton(){const b=document.querySelector('#lid-toggle');b.setAttribute('aria-pressed',String(closed));b.querySelector('span').textContent=closed?'打开屏幕':'合上屏幕';}
  function toggleLid(){closed=!closed;target.lid=closed?0:106;updateLidButton();status.textContent=closed?'屏幕已合上':'屏幕已打开';request();}
  function endDrag(event){
    pointers.delete(event.pointerId);if(pointers.size<2)pinch=null;
    if(drag?.id===event.pointerId){if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);drag=null;stage.classList.remove('dragging');}
  }
  stage.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});velocity=0;
    if(pointers.size===2){const p=[...pointers.values()];pinch={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:target.distance};drag=null;return;}
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,type:event.pointerType,locked:event.pointerType!=='touch',moved:false};
    if(event.pointerType!=='touch'){stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');}
    stage.focus({preventScroll:true});
  },{signal});
  stage.addEventListener('pointermove',event=>{
    if(pointers.has(event.pointerId))pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pinch&&pointers.size===2){const p=[...pointers.values()];const length=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);target.distance=clamp(pinch.zoom*pinch.distance/Math.max(20,length),5.8,11.2);request();return;}
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!drag.locked){
      if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.15){drag=null;return;}
      if(Math.abs(dx)<8)return;
      drag.locked=true;stage.setPointerCapture(event.pointerId);stage.classList.add('dragging');
    }
    const mx=event.clientX-drag.lastX,my=event.clientY-drag.lastY;
    target.yaw-=mx*.008;target.pitch=clamp(target.pitch+my*.006,-.26,1.2);
    velocity=reduced.matches?0:clamp(-mx*.005,-.035,.035);
    drag.lastX=event.clientX;drag.lastY=event.clientY;drag.moved=true;request();
  },{signal});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,event=>{if(name==='lostpointercapture'&&event.target!==stage)return;if(name!=='pointerup'&&drag?.id===event.pointerId)velocity=0;endDrag(event);request();},{signal});
  stage.addEventListener('wheel',event=>{if(!stage.matches(':hover'))return;event.preventDefault();target.distance=clamp(target.distance+event.deltaY*.006,5.8,11.2);request();},{passive:false,signal});
  stage.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape','Home','Enter',' '].includes(event.key))return;event.preventDefault();velocity=0;
    if(event.key==='ArrowLeft')target.yaw-=.16;if(event.key==='ArrowRight')target.yaw+=.16;
    if(event.key==='ArrowUp')target.pitch=clamp(target.pitch+.12,-.26,1.2);if(event.key==='ArrowDown')target.pitch=clamp(target.pitch-.12,-.26,1.2);
    if(['Escape','Home'].includes(event.key))reset();if(['Enter',' '].includes(event.key))toggleLid();request();
  },{signal});
  document.querySelector('#lid-toggle').addEventListener('click',toggleLid,{signal});
  document.querySelector('#reset').addEventListener('click',reset,{signal});
  document.querySelector('#screen-toggle').addEventListener('click',()=>{
    shop=!shop;laptop.setScreen(shop);const b=document.querySelector('#screen-toggle');b.setAttribute('aria-pressed',String(shop));b.querySelector('span').textContent=shop?'切回壁纸':'看看商店';
    if(closed){closed=false;target.lid=106;updateLidButton();}status.textContent=shop?'电脑屏幕正在展示商店示意页面':'已切换为壁纸';request();
  },{signal});
  for(const b of document.querySelectorAll('[data-finish]'))b.addEventListener('click',()=>{
    finish=b.dataset.finish;laptop.setFinish(finish);for(const s of document.querySelectorAll('[data-finish]'))s.setAttribute('aria-pressed',String(s===b));document.querySelector('#finish-label').textContent=finish==='silver'?'银色':'深空灰';status.textContent='已切换为'+(finish==='silver'?'银色':'深空灰');request();
  },{signal});
  const observer=new ResizeObserver(resize);observer.observe(stage);
  const intersection=new IntersectionObserver(()=>{inView=intersectsViewport();if(inView){lastTime=0;request();}else{cancelAnimationFrame(raf);raf=0;velocity=0;}},{rootMargin:'80px'});intersection.observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;velocity=0;}else{lastTime=0;request();}},{signal});
  window.addEventListener('blur',()=>{drag=null;pinch=null;pointers.clear();velocity=0;stage.classList.remove('dragging');},{signal});
  reduced.addEventListener('change',()=>{velocity=0;request();},{signal});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();fail();},{signal});
  resize();syncCamera();renderer.render(scene,camera);frames++;
  document.querySelector('#loading').hidden=true;buttons.forEach(b=>b.disabled=false);status.textContent='三维电脑已准备好，可拖动旋转或点击开合屏幕';
  stage.dataset.ready='true';
  // Read-only diagnostics support reproducible QA without relying on screenshots alone.
  window.__laptopPreview={get state(){return{ready:!disposed,frames,current:{...current},target:{...target},finish,shop,closed,inView,reducedMotion:reduced.matches,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER)}}};
  dispose=()=>{
    if(disposed)return;disposed=true;cancelAnimationFrame(raf);abort.abort();observer.disconnect();intersection.disconnect();
    const geometries=new Set(),materials=new Set(),textures=new Set([...laptop.textures]);
    scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}}});
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();shadow.dispose();environment.dispose();key.shadow.dispose();renderer.dispose();if(!renderer.getContext().isContextLost())renderer.forceContextLoss();
    stage.dataset.ready='false';
  };
}
function fail(){document.querySelector('#loading').hidden=true;document.querySelector('#fallback').hidden=false;stage.dataset.ready='false';buttons.forEach(b=>b.disabled=true);status.textContent='三维显示暂不可用，可重新尝试';}
window.addEventListener('pagehide',()=>dispose());
window.addEventListener('pageshow',event=>{if(event.persisted)safeStart();});
function safeStart(){try{start();}catch(error){dispose();fail();console.error('3D preview failed:',error);}}
safeStart();
