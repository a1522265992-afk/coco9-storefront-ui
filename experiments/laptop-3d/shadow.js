import * as THREE from 'three';
import {HorizontalBlurShader} from 'three/addons/shaders/HorizontalBlurShader.js';
import {VerticalBlurShader} from 'three/addons/shaders/VerticalBlurShader.js';

// A height-aware, blurred projection of the actual geometry. Updated only as the lid moves.
export function createContactShadow(renderer,scene){
  const size=512,width=6,height=4.6;
  const target=new THREE.WebGLRenderTarget(size,size),scratch=new THREE.WebGLRenderTarget(size,size);
  const camera=new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.01,3.5);
  camera.position.set(0,-.035,0);camera.up.set(0,0,1);camera.lookAt(0,1,0);
  const depth=new THREE.MeshDepthMaterial({side:THREE.DoubleSide});
  depth.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );','gl_FragColor = vec4( vec3( 0.0 ), pow(1.0 - fragCoordZ, 3.0) * 0.27 );');
  };
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:target.texture,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));plane.rotation.x=Math.PI/2;plane.position.y=-.025;plane.name='Soft contact shadow';scene.add(plane);
  const blurScene=new THREE.Scene(),blurCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);blurCamera.position.z=1;
  const h=new THREE.ShaderMaterial(HorizontalBlurShader),v=new THREE.ShaderMaterial(VerticalBlurShader);
  h.depthTest=v.depthTest=false;h.depthWrite=v.depthWrite=false;
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),h);blurScene.add(quad);
  function blur(amount){
    quad.material=h;h.uniforms.tDiffuse.value=target.texture;h.uniforms.h.value=amount/size;renderer.setRenderTarget(scratch);renderer.render(blurScene,blurCamera);
    quad.material=v;v.uniforms.tDiffuse.value=scratch.texture;v.uniforms.v.value=amount/size;renderer.setRenderTarget(target);renderer.render(blurScene,blurCamera);
  }
  function update(){
    const oldTarget=renderer.getRenderTarget(),oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha(),oldShadows=renderer.shadowMap.enabled;
    plane.visible=false;scene.overrideMaterial=depth;renderer.shadowMap.enabled=false;renderer.setClearColor(0x000000,0);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
    scene.overrideMaterial=null;blur(3.6);blur(1.2);plane.visible=true;renderer.setRenderTarget(oldTarget);renderer.setClearColor(oldClear,oldAlpha);renderer.shadowMap.enabled=oldShadows;
  }
  function dispose(){target.dispose();scratch.dispose();depth.dispose();h.dispose();v.dispose();quad.geometry.dispose();}
  return {plane,update,dispose};
}
