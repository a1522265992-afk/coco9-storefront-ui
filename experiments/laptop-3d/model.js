import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Original, unbranded model. Metres are scaled by 10 for comfortable scene units.
// Local axes: X across the keyboard, Y up, +Z towards the user. Lid pivots at its lower edge.
function roundShape(w,h,r){
  r=Math.min(r,w/2,h/2);const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function panelGeometry(w,h,d,r=.04,bevel=.008){
  const geometry=new THREE.ExtrudeGeometry(roundShape(w-bevel*2,h-bevel*2,Math.max(.001,r-bevel)),{depth:Math.max(.0001,d-bevel*2),bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:8});
  geometry.translate(0,0,-d/2+bevel);geometry.computeVertexNormals();return geometry;
}
function texture(canvas){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')];}
function round(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function mergeStatic(group){
  const batches=new Map();
  for(const child of [...group.children]){
    if(!child.isMesh||child.userData.keep)continue;
    child.updateMatrix();const geometry=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);
    const key=child.material.uuid;if(!batches.has(key))batches.set(key,{material:child.material,geometries:[]});
    batches.get(key).geometries.push(geometry);group.remove(child);child.geometry.dispose();
  }
  for(const {material,geometries} of batches.values()){
    const merged=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();
    const m=new THREE.Mesh(merged,material);m.castShadow=!material.transparent;m.receiveShadow=!material.transparent;group.add(m);
  }
}
function flatPanel(w,h,r,material){
  const g=new THREE.ShapeGeometry(roundShape(w,h,r),16);
  const p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,p.getY(i)/h+.5);
  return new THREE.Mesh(g,material);
}
function wallpaper(){
  const [c,ctx]=canvas(1600,1000);
  let bg=ctx.createLinearGradient(0,0,1600,1000);bg.addColorStop(0,'#070a0e');bg.addColorStop(.5,'#1d2731');bg.addColorStop(1,'#070b10');ctx.fillStyle=bg;ctx.fillRect(0,0,1600,1000);
  // Layered graphite ribbons with individually shaded folds, generated locally.
  const curves=[[-250,-240,530,100,770,1130,1900,660],[-410,-50,600,-150,730,940,1850,830],[-500,290,530,-140,1020,890,1900,930],[-200,1260,540,1190,690,-30,1730,120],[-190,1130,500,1020,760,130,1860,-150],[-350,860,310,960,1040,50,1860,-260]];
  curves.forEach((v,i)=>{
    ctx.save();ctx.beginPath();ctx.moveTo(v[0],v[1]);ctx.bezierCurveTo(...v.slice(2));ctx.lineTo(v[6]+150,v[7]+230);ctx.bezierCurveTo(v[4]+30,v[5]+170,v[2]-60,v[3]+250,v[0]-80,v[1]+260);ctx.closePath();
    const g=ctx.createLinearGradient(400,100+i*60,1020,760-i*30);
    g.addColorStop(0,'#090c10');g.addColorStop(.25,'#202a33');g.addColorStop(.44,'#778591');g.addColorStop(.49,'#c2cbd2');g.addColorStop(.54,'#3d4954');g.addColorStop(.7,'#12191f');g.addColorStop(1,'#06090c');ctx.fillStyle=g;ctx.shadowColor='#000a';ctx.shadowBlur=30;ctx.fill();ctx.restore();
  });
  const vignette=ctx.createRadialGradient(850,450,200,800,500,980);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#00000080');ctx.fillStyle=vignette;ctx.fillRect(0,0,1600,1000);
  return texture(c);
}
function storefront(){
  const[c,ctx]=canvas(1600,1000);ctx.fillStyle='#f8f9fa';ctx.fillRect(0,0,1600,1000);
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1600,114);ctx.fillStyle='#1b1e22';ctx.font='600 33px Arial';ctx.fillText('COCO9',79,73);
  ctx.fillStyle='#858b94';ctx.font='21px sans-serif';ctx.fillText('数字商店',240,70);ctx.fillText('发现好工具',1110,70);ctx.fillText('我的订单',1318,70);
  round(ctx,82,163,1436,416,24,'#e9edf1');
  ctx.fillStyle='#75818f';ctx.font='17px Arial';ctx.fillText('DIGITAL GOODS, BETTER EVERYDAY',141,230);
  ctx.fillStyle='#22292f';ctx.font='600 62px sans-serif';ctx.fillText('让好想法',139,333);ctx.fillText('更进一步。',139,411);
  ctx.fillStyle='#76818c';ctx.font='23px sans-serif';ctx.fillText('精选数字工具，开启更多可能。',142,474);
  // Quiet editorial orbital illustration in the screen's own storefront.
  ctx.save();ctx.translate(1201,359);ctx.rotate(-.4);for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(0,0,170-i*22,170,0,0,Math.PI*2);ctx.strokeStyle=['#c1cbd3','#a8b7c5','#6d8396','#526b7e','#2b4357'][i];ctx.lineWidth=22;ctx.stroke()}ctx.restore();
  ctx.fillStyle='#303840';ctx.font='600 30px sans-serif';ctx.fillText('为日常，挑选更好的工具',86,647);
  const items=[['AI 助手','把灵感变成行动','#dfe5ef','AI'],['设计工具','给每个创意更多空间','#e6e6de','Aa'],['效率应用','让工作更从容','#dde8e5','↗']];
  items.forEach(([name,desc,color,mark],i)=>{const x=82+i*489;round(ctx,x,685,456,252,16,'white');round(ctx,x+27,710,76,76,16,color);ctx.fillStyle='#455364';ctx.font='500 34px Arial';ctx.fillText(mark,x+44,761);ctx.fillStyle='#26303a';ctx.font='600 25px sans-serif';ctx.fillText(name,x+126,743);ctx.fillStyle='#8b939b';ctx.font='19px sans-serif';ctx.fillText(desc,x+126,777);ctx.fillStyle='#67727e';ctx.font='19px sans-serif';ctx.fillText('发现更多',x+30,891);ctx.fillText('↗',x+398,891)});
  return texture(c);
}

export function createLaptop(){
  const root=new THREE.Group();root.name='Coco9 original laptop';
  const base=new THREE.Group();base.name='Unibody chassis';root.add(base);
  const lid=new THREE.Group();lid.name='Display hinge';lid.position.set(0,.27,-1.09);root.add(lid);
  const metal=new THREE.MeshStandardMaterial({color:0xc8cbd0,metalness:1,roughness:.29});metal.name='Anodised aluminium';
  const edge=new THREE.MeshStandardMaterial({color:0xdfe2e5,metalness:1,roughness:.22});edge.name='Machined bevel';
  const underside=new THREE.MeshStandardMaterial({color:0xb4b8bd,metalness:1,roughness:.36});
  const dark=new THREE.MeshStandardMaterial({color:0x111318,metalness:.2,roughness:.44});
  const black=new THREE.MeshStandardMaterial({color:0x090a0c,metalness:0,roughness:.7});
  const rubber=new THREE.MeshStandardMaterial({color:0x1c1e20,metalness:0,roughness:.88});
  const keyMat=new THREE.MeshStandardMaterial({color:0x040506,metalness:0,roughness:.76});
  const[grain,gc]=canvas(256,256);const pixels=gc.createImageData(256,256);let seed=48371;
  for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=115+(seed%26);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=n;pixels.data[i+3]=255;}gc.putImageData(pixels,0,0);
  const grainMap=new THREE.CanvasTexture(grain);grainMap.wrapS=grainMap.wrapT=THREE.RepeatWrapping;grainMap.repeat.set(10,10);
  metal.bumpMap=underside.bumpMap=grainMap;metal.bumpScale=underside.bumpScale=.0012;
  const screwMat=new THREE.MeshStandardMaterial({color:0x53585d,metalness:1,roughness:.32});
  const add=(group,geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);group.add(mesh);return mesh;};
  const slab=(group,w,h,d,r,b,mat,x,y,z,rx=0,ry=0)=>add(group,panelGeometry(w,h,d,r,b),mat,x,y,z,rx,ry);
  slab(base,3.4,2.37,.133,.12,.024,metal,0,.12,0,-Math.PI/2);
  slab(base,3.35,2.31,.027,.105,.006,underside,0,.054,0,-Math.PI/2);
  // The hairline around the bottom cover remains visible at rear/underside angles.
  slab(base,3.357,2.317,.003,.108,.001,dark,0,.066,0,-Math.PI/2);
  slab(base,3.355,2.315,.024,.108,.005,underside,0,.052,0,-Math.PI/2);
  slab(base,2.79,1.193,.012,.065,.004,dark,0,.187,-.298,-Math.PI/2);
  // Trackpad chamfer, inset surface, and front opening scallop.
  slab(base,1.37,.661,.005,.055,.001,edge,0,.187,.689,-Math.PI/2);
  slab(base,1.349,.640,.008,.046,.002,metal,0,.190,.689,-Math.PI/2);
  slab(base,.52,.025,.035,.012,.003,underside,0,.170,1.174,0);
  slab(base,.42,.012,.010,.006,.002,edge,0,.156,1.185,0);
  // Hinge barrel and a long recessed exhaust vent.
  const barrel=add(base,new THREE.CylinderGeometry(.071,.071,2.78,32),dark,0,.182,-1.07,0,0,Math.PI/2);
  barrel.name='Hinge barrel';
  slab(base,2.9,.076,.018,.02,.004,black,0,.106,-1.18,0);
  for(let i=0;i<61;i++)slab(base,.012,.068,.009,.003,.001,underside,-1.41+i*.047,.109,-1.188,0);
  // Both sides have physically modelled port mouths, linings and internal tongues.
  function usbC(side,z){
    slab(base,.083,.035,.011,.016,.002,edge,side*1.694,.124,z,0,Math.PI/2);
    slab(base,.070,.024,.013,.011,.002,black,side*1.701,.124,z,0,Math.PI/2);
    slab(base,.041,.005,.016,.002,.001,screwMat,side*1.709,.123,z,0,Math.PI/2);
  }
  usbC(-1,-.75);usbC(-1,-.48);usbC(1,-.72);
  slab(base,.175,.041,.014,.012,.003,edge,1.692,.123,-.40,0,Math.PI/2);
  slab(base,.152,.028,.020,.008,.002,black,1.7,.123,-.40,0,Math.PI/2);
  slab(base,.171,.010,.010,.005,.001,black,1.699,.112,.09,0,Math.PI/2);
  const jack=add(base,new THREE.CylinderGeometry(.026,.026,.012,24),black,-1.704,.124,-.16,0,0,Math.PI/2);
  const jackRing=add(base,new THREE.TorusGeometry(.027,.003,8,24),edge,-1.712,.124,-.16,0,Math.PI/2);
  // Discrete speaker holes use one geometry batch, not hundreds of draw calls.
  for(const side of [-1,1])for(let row=0;row<40;row++)for(let col=0;col<6;col++){
    const hole=add(base,new THREE.CircleGeometry(.004,6),black,side*(1.458+col*.021),.1875,-.87+row*.027,-Math.PI/2);
  }
  // Bottom feet and screw heads are visible when the laptop is turned over.
  for(const x of [-1.38,1.38])for(const z of [-.9,.91]){
    add(base,new THREE.CylinderGeometry(.086,.080,.027,32),rubber,x,.026,z);
    add(base,new THREE.CylinderGeometry(.015,.015,.003,12),screwMat,x,.036,z+.15);
  }
  const [labels,labelCtx]=canvas(1600,720);labelCtx.clearRect(0,0,1600,720);labelCtx.fillStyle='#bec1c7';labelCtx.textAlign='center';labelCtx.textBaseline='middle';
  const rows=[
    [['esc',1.5],...Array.from({length:12},(_,i)=>['F'+(i+1),1]),['◉',1]],
    [...['`','1','2','3','4','5','6','7','8','9','0','−','='].map(x=>[x,1]),['delete',1.5]],
    [['tab',1.5],...['Q','W','E','R','T','Y','U','I','O','P','[',']','\\'].map(x=>[x,1])],
    [['caps',1.75],...['A','S','D','F','G','H','J','K','L',';',"'"].map(x=>[x,1]),['return',1.75]],
    [['shift',2.25],...['Z','X','C','V','B','N','M',',','.','/'].map(x=>[x,1]),['shift',2.25]],
    [['fn',1],['ctrl',1],['option',1.25],['⌘',1.25],['',4.5],['⌘',1.25],['option',1.25],['‹',1],['⌃',1],['›',1]]
  ];
  const keyWidth=2.686,keyDepth=1.12,cell=keyWidth/14.5;
  rows.forEach((row,ri)=>{
    const z=-.81+ri*.182;const kh=ri===0?.093:.150;let current=-keyWidth/2;
    row.forEach(([label,units])=>{
      const kw=cell*units-.023,x=current+cell*units/2;current+=cell*units;
      slab(base,kw,kh,.023,.021,.004,keyMat,x,.204,z,-Math.PI/2);
      const tx=(x/keyWidth+.5)*1600,ty=(z+.91)/keyDepth*720;
      labelCtx.font=(label.length>2?'19':'26')+'px -apple-system,Arial,sans-serif';labelCtx.fillText(label,tx,ty);
      if(ri===1&&label.length===1&&label!=='`'){labelCtx.font='13px Arial';}
    });
  });
  const labelsMat=new THREE.MeshBasicMaterial({map:texture(labels),transparent:true,alphaTest:.1,depthWrite:false,toneMapped:false});
  add(base,new THREE.PlaneGeometry(keyWidth,keyDepth),labelsMat,0,.2165,-.35,-Math.PI/2);
  // Lid back, polished edge, black rubber gasket, glass bezel and the active display.
  slab(lid,3.393,2.16,.064,.108,.016,metal,0,1.08,-.021);
  slab(lid,3.37,2.137,.014,.098,.004,edge,0,1.08,.011);
  slab(lid,3.335,2.11,.025,.088,.006,rubber,0,1.078,.022);
  const bezelMat=new THREE.MeshPhysicalMaterial({color:0x080a0c,metalness:.05,roughness:.24,clearcoat:.9,clearcoatRoughness:.12});
  slab(lid,3.296,2.065,.014,.073,.003,bezelMat,0,1.08,.039);
  const wallpapers=[wallpaper(),storefront()];
  const displayMat=new THREE.MeshBasicMaterial({map:wallpapers[0],toneMapped:false});displayMat.name='Screen content';
  const display=flatPanel(3.16,1.975,.032,displayMat);display.position.set(0,1.093,.048);display.userData.keep=true;lid.add(display);
  // Camera dot in the thin top bezel.
  add(lid,new THREE.CircleGeometry(.012,24),black,0,2.117,.0485);
  add(lid,new THREE.CircleGeometry(.005,16),new THREE.MeshPhysicalMaterial({color:0x142633,metalness:.6,roughness:.13,clearcoat:1}),0,2.117,.049);
  // A fine underside inscription, without a third-party logo or trademark.
  const[engraving,ec]=canvas(512,80);ec.fillStyle='#6f757b';ec.textAlign='center';ec.font='16px Arial';ec.fillText('C O C O 9    /    D I G I T A L   E V E R Y D A Y',256,40);
  add(base,new THREE.PlaneGeometry(.8,.125),new THREE.MeshBasicMaterial({map:texture(engraving),transparent:true,depthWrite:false}),0,.037,.55,Math.PI/2);
  mergeStatic(base);mergeStatic(lid);
  const setOpen=degrees=>{lid.rotation.x=Math.PI/2-THREE.MathUtils.degToRad(degrees)};setOpen(106);
  const setFinish=name=>{const silver=name==='silver';metal.color.setHex(silver?0xc8cbd0:0x53565c);underside.color.setHex(silver?0xb4b8bd:0x454950);edge.color.setHex(silver?0xdfe2e5:0x8d9198)};
  const setScreen=shop=>{displayMat.map=wallpapers[shop?1:0];displayMat.needsUpdate=true};
  return {root,lid,base,setOpen,setFinish,setScreen,textures:wallpapers};
}
