import React, {useLayoutEffect, useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useLoader, useThree} from '@react-three/fiber';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {roofGeometry} from './Architecture';

type P = [number, number, number];
const dark = new THREE.MeshStandardMaterial({color:'#362b23', roughness:.72});
const iron = new THREE.MeshStandardMaterial({color:'#514f43', metalness:.75, roughness:.42});
const cube = (()=>{
  const s = new THREE.Shape(); s.moveTo(-.475,-.475); s.lineTo(.475,-.475); s.lineTo(.475,.475); s.lineTo(-.475,.475); s.closePath();
  const g = new THREE.ExtrudeGeometry(s,{depth:.95,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025});
  g.translate(0,0,-.475); return g;
})();
const B: React.FC<{p:P;s:P;m:THREE.Material;r?:P}> = ({p,s,m,r})=>{
  const geometry=useMemo(()=>{
    const g=cube.clone();g.scale(...s);const pos=g.getAttribute('position'),normal=g.getAttribute('normal'),uv=g.getAttribute('uv');
    for(let i=0;i<pos.count;i++){
      const nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
      if(nz>=nx&&nz>=ny)uv.setXY(i,pos.getX(i)/2,pos.getY(i)/2);
      else if(ny>=nx)uv.setXY(i,pos.getX(i)/2,pos.getZ(i)/2);
      else uv.setXY(i,pos.getZ(i)/2,pos.getY(i)/2);
    }return g;
  },[s]);
  return <mesh geometry={geometry} position={p} material={m} rotation={r} castShadow receiveShadow/>;
};

const useSurface = ()=>{
  const maps=useLoader(THREE.TextureLoader,['earth','wood','clay','stone'].map(n=>staticFile(`changan-v2/${n}.jpg`)));
  return useMemo(()=>{
    maps.forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;});
    return {
      earth:new THREE.MeshPhongMaterial({map:maps[0],bumpMap:maps[0],bumpScale:.025,shininess:1,specular:'#000000',color:'#e1d9ca'}),
      wood:new THREE.MeshPhongMaterial({map:maps[1],bumpMap:maps[1],bumpScale:.014,shininess:35,specular:'#68574a',specularMap:maps[1],color:'#c6a795'}),
      clay:new THREE.MeshPhongMaterial({map:maps[2],bumpMap:maps[2],bumpScale:.014,shininess:18,specular:'#3c4144',color:'#c7d2dc',side:THREE.DoubleSide}),
      stone:new THREE.MeshLambertMaterial({map:maps[3],color:'#d4ccbc'}),
    };
  },[maps]);
};
type Mats=ReturnType<typeof useSurface>;

const tube=(()=>{
  const v:number[]=[],uv:number[]=[];
  for(let i=0;i<12;i++){
    for(const [a,z] of [[i,0],[i+1,0],[i+1,.44],[i,0],[i+1,.44],[i,.44]]){
      const angle=a/12*Math.PI;
      v.push(Math.cos(angle)*.105,Math.sin(angle)*.105,z); uv.push(a/12,z/.44);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
})();

const Tiles:React.FC<{w:number;d:number;rise:number;y:number;m:THREE.Material}>=({w,d,rise,y,m})=>{
  const data=useMemo(()=>{
    const matrices:THREE.Matrix4[]=[];const dummy=new THREE.Object3D();
    const steps=Math.ceil(d/2/.32),ridge=w*.29;
    const height=(t:number)=>rise*Math.pow(1-t,1.6)+.11*Math.pow(t,10);
    for(const side of [-1,1])for(let row=0;row<steps;row++){
      const t=(row+.05)/steps;const z=side*d/2*t;
      const half=ridge+(w/2-ridge)*t;
      for(let x=-half+.12;x<half-.05;x+=.23){
        const slope=(height(Math.min(t+.01,1))-height(t))/(d/2*.01);
        dummy.position.set(x,y+height(t)+.025,z);dummy.lookAt(x,y+height(t)+.025+slope,z+side);
        dummy.updateMatrix();matrices.push(dummy.matrix.clone());
      }
    }
    for(const side of [-1,1])for(let row=1;row<9;row++){
      const t=row/9;const x=side*(ridge+(w/2-ridge)*t),half=d/2*t;
      for(let z=-half;z<half;z+=.23){
        const slope=(height(Math.min(t+.01,1))-height(t))/((w/2-ridge)*.01);
        dummy.position.set(x,y+height(t)+.03,z);dummy.lookAt(x+side,y+height(t)+.03+slope,z);dummy.updateMatrix();matrices.push(dummy.matrix.clone());
      }
    }
    return matrices;
  },[w,d,rise,y]);
  return <instancedMesh args={[tube,m,data.length]} castShadow receiveShadow ref={mesh=>{
    if(!mesh)return;data.forEach((a,i)=>{mesh.setMatrixAt(i,a);mesh.setColorAt(i,new THREE.Color().setScalar(.76+.22*((Math.sin(i*83.17)+1)/2)));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }}/>;
};

const DetailedRoof:React.FC<{w:number;d:number;y:number;rise?:number;m:Mats;detail?:boolean}>=({w,d,y,rise=1.8,m,detail=true})=>{
  const g=useMemo(()=>roofGeometry(w,d,rise,detail?16:4,detail?10:3),[w,d,rise,detail]);
  return <group>
    <mesh position={[0,y,0]} geometry={g} material={m.clay} castShadow receiveShadow/>
    {detail?<Tiles w={w} d={d} rise={rise} y={y} m={m.clay}/>:null}
    {[-1,1].map(s=><React.Fragment key={s}>
      <B p={[0,y-.08,s*d/2]} s={[w,.2,.24]} m={m.wood}/>
      <B p={[s*w/2,y-.08,0]} s={[.22,.2,d]} m={m.wood}/>
    </React.Fragment>)}
    {Array.from({length:detail?Math.floor(w/.23):0},(_,i)=>{
      const x=-w/2+.14+i*.23;
      return <React.Fragment key={i}>
        <B p={[x,y-.28,0]} s={[.095,.12,d+.2]} m={m.wood}/>
        {[-1,1].map(s=><mesh key={s} position={[x,y+.03,s*(d/2+.025)]} rotation={[Math.PI/2,0,0]} castShadow><cylinderGeometry args={[.107,.107,.055,16]}/><primitive object={m.clay} attach="material"/></mesh>)}
      </React.Fragment>;
    })}
    <B p={[0,y+rise+.085,0]} s={[w*.6,.23,.32]} m={m.clay}/>
  </group>;
};

const Bracket:React.FC<{x:number;z:number;m:Mats}>=({x,z,m})=><group position={[x,4.55,z]}>
  <B p={[0,0,0]} s={[.62,.2,.6]} m={m.wood}/>
  {[-1,1].map(s=><React.Fragment key={s}>
    <B p={[s*.24,.2,0]} s={[.17,.34,.3]} m={m.wood} r={[0,0,-s*.52]}/>
    <B p={[0,.2,s*.26]} s={[.3,.34,.16]} m={m.wood} r={[s*.52,0,0]}/>
  </React.Fragment>)}
  <B p={[0,.44,0]} s={[1.1,.18,.32]} m={m.wood}/>
  <B p={[0,.62,0]} s={[.3,.2,1.45]} m={m.wood}/>
  <B p={[0,.82,0]} s={[1.4,.15,.38]} m={m.wood}/>
</group>;

const Door:React.FC<{side:number;m:Mats}>=({side,m})=><group position={[side*2.45,0,-1.5]} rotation={[0,-side*Math.PI*.47,0]}>
  {Array.from({length:10},(_,i)=><B key={i} p={[-side*(i+.5)*.245,2.1,0]} s={[.238,4.05,.16]} m={m.wood}/>)}
  {[.6,1.7,2.8,3.8].map(y=><B key={y} p={[-side*1.225,y,.1]} s={[2.38,.12,.095]} m={dark}/>)}
  <mesh position={[-side*.32,1.95,.2]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[.13,.025,8,20]}/><primitive object={iron} attach="material"/></mesh>
  {[.7,1.7,2.8,3.7].map(y=>[-.6,-1.2,-1.8].map(x=><mesh key={`${x}-${y}`} position={[side*x,y,.15]}><sphereGeometry args={[.035,8,8]}/><primitive object={iron} attach="material"/></mesh>))}
</group>;

const GateV2:React.FC<{m:Mats}>=({m})=><group>
  <DetailedRoof w={14} d={8} y={5.55} m={m}/>
  {[-5.4,-2.7,2.7,5.4].map(x=><group key={x}>
    {[-1.7,1.7].map(z=><group key={z}>
      <B p={[x,.16,z]} s={[.8,.32,.8]} m={m.stone}/>
      <mesh position={[x,2.45,z]} castShadow receiveShadow><cylinderGeometry args={[.22,.27,4.55,32]}/><primitive object={m.wood} attach="material"/></mesh>
      <Bracket x={x} z={z} m={m}/>
    </group>)}
    <B p={[x,4.35,0]} s={[.35,.44,5.1]} m={m.wood}/>
  </group>)}
  {[-1,1].map(s=><React.Fragment key={s}>
    <B p={[0,4.3,s*1.7]} s={[11.2,.43,.35]} m={m.wood}/>
    <B p={[0,4.78,s*1.7]} s={[11.5,.21,.3]} m={m.wood}/>
    <B p={[s*4.1,2.1,0]} s={[2.15,4.2,.36]} m={m.earth}/>
    <B p={[s*15.1,1.65,0]} s={[19,3.3,1.25]} m={m.earth}/>
    <B p={[s*15.1,.2,0]} s={[19.1,.4,1.38]} m={m.stone}/>
    <B p={[s*15.1,3.31,0]} s={[19.15,.14,1.45]} m={m.clay}/>
    <Door side={s} m={m}/>
  </React.Fragment>)}
  <B p={[0,.04,0]} s={[5,.08,4.2]} m={m.stone}/>
  {[-4.4,-3.7,3.7,4.4].map(x=><B key={x} p={[x,2.15,.22]} s={[.08,2.8,.06]} m={m.wood}/>)}
</group>;

const World:React.FC=React.memo(()=>{
  const m=useSurface();
  const instances=useMemo(()=>{
    const list:THREE.Matrix4[]=[];const obj=new THREE.Object3D();
    for(let r=0;r<60;r++)for(let c=0;c<52;c++){
      obj.position.set((c-25.5)*.76+(r%2)*.38,.025,(r-24)*1.1);
      obj.scale.set(.738,.055,1.075);obj.rotation.y=Math.sin(r*14+c*19)*.004;obj.updateMatrix();list.push(obj.matrix.clone());
    }return list;
  },[]);
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.02,0]} receiveShadow><planeGeometry args={[1000,1000]}/><meshStandardMaterial color="#857965" roughness={1}/></mesh>
    <instancedMesh args={[new THREE.BoxGeometry(1,1,1),m.stone,instances.length]} receiveShadow ref={mesh=>{if(!mesh)return;instances.forEach((a,i)=>{mesh.setMatrixAt(i,a);mesh.setColorAt(i,new THREE.Color().setScalar(.81+.19*(Math.sin(i*27.7)+1)/2));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}}/>
    <GateV2 m={m}/><group position={[3,0,-30]}><B p={[0,1.8,0]} s={[16,3.6,6]} m={m.earth}/><DetailedRoof w={18} d={8} y={3.9} rise={1.7} m={m} detail={false}/></group>
    {[-1,1].map(side=><React.Fragment key={side}>
      <B p={[side*10,1.6,-17]} s={[.8,3.2,30]} m={m.earth}/>
      {[-12,-25,-40].map(z=><group key={z} position={[side*15,0,z]}>
        <B p={[0,1.7,0]} s={[8,3.4,6]} m={m.earth}/>
        <DetailedRoof w={10} d={8} y={3.6} rise={1.3} m={m} detail={false}/>
      </group>)}
    </React.Fragment>)}
    <group position={[0,0,-65]}><B p={[0,1.8,0]} s={[13,3.6,6]} m={m.earth}/><DetailedRoof w={15} d={8} y={3.8} rise={1.7} m={m} detail={false}/></group>
  </group>;
});

const Lighting:React.FC<{frame:number}>=({frame})=>{
  const {camera,scene,gl}=useThree();
  useLayoutEffect(()=>{scene.environment=null;gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;},[scene,gl]);
  useLayoutEffect(()=>{
    const t=frame/299;
    camera.position.set(-5.7+t*2.2,2.1,21-t*5.5);camera.lookAt(0,3.5,0);camera.updateMatrixWorld();
  },[camera,frame]);
  return null;
};

export const MaterialStudy:React.FC=()=>{
  const f=useCurrentFrame();
  const fade=interpolate(f,[0,12,287,299],[0,1,1,0]);
  return <AbsoluteFill style={{background:'#a9bccb',fontFamily:'StudySans, sans-serif'}}>
    <style>{`@font-face{font-family:StudySans;src:url('${staticFile('changan-v2/sans.otf')}')}`}</style>
    <Audio src={staticFile('changan/ambience.wav')} startFrom={720}/>
    <ThreeCanvas width={1920} height={1080} shadows camera={{position:[-5.7,2.1,21],fov:43,near:.1,far:500}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.05}}>
      <color attach="background" args={['#b6c7d2']}/>
      <fog attach="fog" args={['#b6c7d2',90,320]}/>
      <hemisphereLight args={['#b6c9dd','#6a5947',1.15]}/>
      <directionalLight position={[-18,17,12]} color="#ffddae" intensity={3.3} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-36} shadow-camera-right={36} shadow-camera-top={32} shadow-camera-bottom={-32} shadow-camera-far={100} shadow-normalBias={.025}/>
      <directionalLight position={[12,14,20]} color="#ccd9e8" intensity={.65}/><pointLight position={[-2,4,12]} color="#ffe2bc" intensity={55} distance={40} decay={2}/><World/><Lighting frame={f}/>
    </ThreeCanvas>
    <AbsoluteFill style={{background:'linear-gradient(0deg,rgba(0,0,0,.56),transparent 24%,transparent 85%,rgba(0,0,0,.22))',opacity:fade}}/>
    <div style={{position:'absolute',left:65,top:48,color:'#fff5e5',fontSize:25,letterSpacing:5,opacity:fade}}>走进唐长安城</div>
    <div style={{position:'absolute',right:65,top:51,color:'#fff3df',fontSize:19,letterSpacing:2,opacity:fade,textShadow:'0 2px 5px #000'}}>情境演绎 · 10 秒材质样片</div>
    <div style={{position:'absolute',bottom:78,left:130,right:130,textAlign:'center',color:'white',fontSize:35,lineHeight:1.6,textShadow:'0 2px 5px #000,0 0 12px #000',opacity:fade}}>{f<150?'沿着街道，走近长安的一座坊门。':'灰瓦、木构与夯土，勾勒街坊的边界。'}</div>
    <div style={{position:'absolute',bottom:29,left:65,color:'#f0e8dc',fontSize:17,opacity:fade}}>坊制依据：《长安志》卷七；建筑形制、材质与尺度为情境推演。</div>
  </AbsoluteFill>;
};
