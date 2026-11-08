import React, {useLayoutEffect} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {City, Street} from './Architecture';

type V3 = [number, number, number];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: V3, b: V3, t: number): V3 => a.map((v, i) => mix(v, b[i], t)) as V3;
const smooth = (t: number) => t * t * (3 - 2 * t);

export const walkPose = (frame: number) => {
  // Linear, constant-speed travel; 1.65 m eye height; no head bob or sudden yaw.
  const t = Math.max(0, Math.min(frame / 239, 1));
  const z = mix(9, -4, t);
  return {position: [0, 1.65, z] as V3, target: [0, 1.85, z - 30] as V3, fov: 60};
};

export const shotAt = (f: number) => {
  if (f < 360) return 0;
  if (f < 720) return 1;
  if (f < 1200) return 2;
  if (f < 1500) return 3;
  return 4;
};

export const cameraPose = (frame: number, test = false) => {
  if (test) return walkPose(frame);
  const s = shotAt(frame);
  if (s === 0) return {position: lerpV([108, 111, 122], [99, 103, 115], smooth(frame / 359)), target: [0, 0, -2] as V3, fov: 43};
  if (s === 1) return {position: lerpV([3, 119, 72], [3, 107, 65], smooth((frame - 360) / 359)), target: [0, 0, -2] as V3, fov: 45};
  if (s === 2) {
    const local = frame - 720;
    if (local < 240) return walkPose(local);
    const t = (local - 240) / 239;
    const z = mix(-4, -16, t);
    return {position: [0, 1.65, z] as V3, target: [mix(0, 2, smooth(t)), 1.85, z - 30] as V3, fov: 60};
  }
  if (s === 3) return {position: lerpV([6, 2.05, 15], [4.6, 2.05, 14], smooth((frame - 1200) / 299)), target: [0, 2.7, 0] as V3, fov: 51};
  return {position: lerpV([61, 72, 82], [112, 119, 132], smooth((frame - 1500) / 299)), target: [0, 0, -2] as V3, fov: 43};
};

const Camera: React.FC<{frame: number; test: boolean}> = ({frame, test}) => {
  const {camera} = useThree();
  const {position, target, fov} = cameraPose(frame, test);
  useLayoutEffect(() => {
    camera.position.set(...position); camera.lookAt(...target);
    (camera as THREE.PerspectiveCamera).fov = fov;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix(); camera.updateMatrixWorld();
  }, [camera, position, target, fov]);
  return null;
};

const ShadowCache: React.FC<{door: number; shot: number}> = ({door, shot}) => {
  const {gl} = useThree();
  useLayoutEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, door, shot]);
  return null;
};

// Check the actual rendered mesh bounds, including open/closing door leaves.
const CameraClearance: React.FC<{frame: number; test: boolean; enabled: boolean}> = ({frame, test, enabled}) => {
  const {scene} = useThree();
  useLayoutEffect(() => {
    if (!enabled) return;
    scene.updateMatrixWorld(true);
    const p = new THREE.Vector3(...cameraPose(frame, test).position);
    const safety = new THREE.Sphere(p, .25);
    const box = new THREE.Box3();
    let clearance = Infinity;
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      box.setFromObject(object);
      clearance = Math.min(clearance, box.distanceToPoint(p));
      if (box.intersectsSphere(safety)) throw new Error(`Camera intersects rendered mesh at frame ${frame}: ${object.uuid}`);
    });
    if (test && frame === 239) console.log(`CAMERA CHECK: all sampled frames collision-free; final mesh clearance ${clearance.toFixed(2)}m; eye height ${p.y.toFixed(2)}m`);
  }, [scene, frame, test, enabled]);
  return null;
};

export const cues = [
  [0, 4, '这座棋盘般的城市，就是唐代长安。'],
  [4, 8, '今天，我们从高空出发，走进它的街坊。'],
  [8, 12, '北部的宫城与皇城，构成城市的政治中心。'],
  [12, 16, '朱雀大街向南延伸，是重要的南北轴线。'],
  [16, 20, '纵横的街道，把城市分成一片片坊。'],
  [20, 24, '东市与西市，是两处重要的交易空间。'],
  [24, 28, '现在，把视线降到行人的高度。'],
  [28, 32, '穿过坊门，街坊内部的生活空间逐渐展开。'],
  [32, 36, '夯土围墙划出边界，院落沿坊内道路展开。'],
  [36, 40, '木构门屋、灰瓦屋顶，组成层层递进的街景。'],
  [40, 44, '坊门，也是一道管理日常生活的边界。'],
  [44, 48, '唐代有夜禁；开闭门鼓，标示通行时段。'],
  [48, 52, '公事急速、疾病等情形，法律另有例外。'],
  [52, 56, '再看长安：道路、街坊与制度，共同组织城市。'],
  [56, 60, '读懂一座城，也就走近了古人的生活。'],
] as const;

const chapters = [
  ['01', '俯瞰长安', '城，不只是一片屋顶'],
  ['02', '道路成网', '从中轴，读懂一座城'],
  ['03', '走入街坊', '由街入坊，尺度回到人'],
  ['04', '坊门与夜禁', '空间的边界，也是时间的边界'],
  ['05', '再望长安', '街道 · 街坊 · 制度'],
];

const project = (p: V3, f: number) => {
  const pose = cameraPose(f);
  const camera = new THREE.PerspectiveCamera(pose.fov, 16 / 9, .1, 1000);
  camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
  const v = new THREE.Vector3(...p).project(camera);
  return {left: (v.x + 1) * 960, top: (1 - v.y) * 540};
};

const CityLabels: React.FC<{frame: number; shot: number}> = ({frame, shot}) => {
  const labels: {p: V3; text: string; small?: string}[] = [
    {p: [0, 2, -34], text: '宫城', small: '北部 · 太极宫'},
    {p: [0, 1, -17], text: '皇城'},
    {p: [-22.75, 1, -4], text: '西市'},
    {p: [22.75, 1, -4], text: '东市'},
    {p: [0, .3, 22], text: '朱雀大街'},
  ];
  return <>{labels.map((label, i) => {
    const pos = project(label.p, frame);
    const on = shot === 1 || (shot === 0 && frame > 150) || shot === 4;
    const opacity = on ? interpolate(frame, shot === 0 ? [150 + i * 9, 180 + i * 9] : shot === 1 ? [360, 385] : [1500, 1530], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
    return <div key={label.text} style={{position: 'absolute', ...pos, transform: 'translate(-50%, -100%)', opacity, textAlign: 'center'}}>
      <div style={{background: '#18251edb', border: '1px solid #ead5a07a', padding: '8px 17px', color: '#fff1d0', fontSize: 28, letterSpacing: 3, borderRadius: 2}}>{label.text}{label.small && shot !== 1 ? <div style={{fontSize: 16, letterSpacing: 1, marginTop: 4}}>{label.small}</div> : null}</div>
      <div style={{height: 22, width: 1, background: '#fff0c2', margin: 'auto'}}/>
      <div style={{width: 6, height: 6, borderRadius: 5, background: '#fff0c2', margin: 'auto'}}/>
    </div>;
  })}</>;
};

export const ChanganFilm: React.FC<{test?: boolean}> = ({test = false}) => {
  const frame = useCurrentFrame();
  const filmFrame = test ? 720 + frame : frame;
  const shot = test ? 2 : shotAt(frame);
  const city = shot === 0 || shot === 1 || shot === 4;
  const chapter = chapters[shot];
  const cue = cues.find(([a, b]) => filmFrame >= a * 30 && filmFrame < b * 30);
  const close = shot === 3 ? interpolate(frame, [1230, 1430], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  const source = city ? '布局依据：《长安志》卷六、七、八、九、十' : shot === 3 ? '制度依据：《唐六典》卷三；《唐律疏议》卷八、二十六' : '街景为情境演绎；坊制参见《长安志》卷七';
  const shotStart = [0, 360, 720, 1200, 1500][shot];
  const shotEnd = [360, 720, 1200, 1500, 1800][shot];
  const fade = test ? 0 : Math.max(interpolate(frame, [shotStart, shotStart + 9], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), interpolate(frame, [shotEnd - 8, shotEnd - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return <AbsoluteFill style={{backgroundColor: '#c9d0c3', color: '#f6eed8', fontFamily: 'ChanganSans, "Noto Sans CJK SC", sans-serif'}}>
    <Audio src={staticFile('changan/ambience.wav')} startFrom={test ? 720 : 0}/>
    <style>{`@font-face{font-family:ChanganSerif;src:url('${staticFile('changan/serif.otf')}')}@font-face{font-family:ChanganSans;src:url('${staticFile('changan/sans.otf')}')}`}</style>
    <ThreeCanvas width={1920} height={1080} shadows camera={{fov: 50, near: .15, far: 700, position: [0, 1.65, 22]}} gl={{antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15}}>
      <Camera frame={frame} test={test}/>
      <color attach="background" args={[city ? '#c9d0c3' : shot === 3 ? '#bcb8a2' : '#c5d0cb']}/>
      <fog key={`fog-${shot}`} attach="fog" args={[city ? '#c9d0c3' : '#c5d0cb']} color={city ? '#c9d0c3' : '#c5d0cb'} near={city ? 160 : 50} far={city ? 460 : 210}/>
      <hemisphereLight args={['#dfe9e7', '#92815c', 1.7]}/>
      <directionalLight position={city ? [-60, 100, 40] : [-24, 35, 20]} color={shot === 3 ? '#ffd19a' : '#ffe2b6'} intensity={3.1} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.0003} shadow-normalBias={.035} shadow-camera-left={city ? -80 : -65} shadow-camera-right={city ? 80 : 65} shadow-camera-top={city ? 80 : 65} shadow-camera-bottom={city ? -80 : -65} shadow-camera-far={city ? 240 : 150}/>
      {city ? <City/> : <Street close={close}/>}
      <ShadowCache door={close} shot={shot}/>
      <CameraClearance frame={frame} test={test} enabled={!city}/>
    </ThreeCanvas>
    <AbsoluteFill style={{background: 'linear-gradient(180deg,rgba(16,28,26,.42) 0%,transparent 25%,transparent 70%,rgba(15,24,21,.83) 100%)', pointerEvents: 'none'}}/>
    <div style={{position: 'absolute', top: 54, left: 74, right: 74, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 20, letterSpacing: 5, textShadow: '0 2px 10px #15201a'}}>
      <div>历史现场 <span style={{opacity: .5, margin: '0 18px'}}> / </span> 唐代 · 长安</div>
      <div style={{fontSize: 22, letterSpacing: 2, padding: '10px 18px', border: '1px solid #e7dec57a', background: '#24372e91'}}>{city ? '布局示意' : '情境演绎'}<span style={{fontSize: 17, marginLeft: 14, opacity: .84}}>{city ? '街坊合并 · 比例简化' : '建筑形制与尺度为推演'}</span></div>
    </div>
    <div style={{position: 'absolute', top: 122, left: 74, textShadow: '0 3px 18px #28302588'}}>
      <div style={{fontSize: 18, color: '#edd3a1', letterSpacing: 4, marginBottom: 13}}>{test ? '8 秒镜头测试' : `CHAPTER ${chapter[0]}`}</div>
      <div style={{fontFamily: 'ChanganSerif, serif', fontSize: shot === 0 ? 78 : 54, letterSpacing: 8, lineHeight: 1.25}}>{shot === 0 ? '走进唐长安城' : chapter[1]}</div>
      <div style={{fontSize: 23, letterSpacing: 3, marginTop: 18, opacity: .9}}>{chapter[2]}</div>
      <div style={{width: 72, height: 2, background: '#e2bd77', marginTop: 25}}/>
    </div>
    {city ? <CityLabels frame={frame} shot={shot}/> : null}
    {shot === 3 && frame > 1320 ? <div style={{position: 'absolute', right: 76, top: 183, width: 420, padding: '22px 28px', background: '#18251ddd', borderLeft: '3px solid #ddbc7f', lineHeight: 1.8, fontSize: 25}}>
      <div style={{fontSize: 18, color: '#dfc28c', letterSpacing: 3}}>文献中的制度</div>
      <div>“诸犯夜者，笞二十。”</div>
      <div style={{fontSize: 20, color: '#e0dccb'}}>“有故者，不坐。”</div>
      <div style={{fontSize: 17, marginTop: 8, opacity: .7}}>《唐律疏议》卷二十六</div>
    </div> : null}
    <div style={{position: 'absolute', bottom: 104, left: 120, right: 120, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontSize: 40, fontWeight: 500, letterSpacing: 1.5, lineHeight: 1.55, padding: '8px 28px 12px', textAlign: 'center', background: '#14251ee0', borderRadius: 4, textShadow: '0 2px 4px #000'}}>{cue?.[2]}</div>
    </div>
    <div style={{position: 'absolute', left: 75, right: 75, bottom: 49, display: 'flex', justifyContent: 'space-between', fontSize: 19, color: '#e4ddc9', letterSpacing: .5}}>
      <div>{source}</div><div>{test ? 'WALK TEST · 1080P / 30' : `${('0' + Math.floor(frame / 30)).slice(-2)} / 60 秒`}</div>
    </div>
    {shot === 4 && frame >= 1680 ? <div style={{position: 'absolute', top: 390, right: 75, width: 510, padding: '26px 30px', background: '#17291ee8', borderTop: '2px solid #dfbf82', fontSize: 21, lineHeight: 1.8}}>
      <div style={{fontSize: 16, letterSpacing: 4, color: '#e1c48e', marginBottom: 10}}>资料与复原说明</div>
      <div>宋敏求《长安志》卷六至十</div>
      <div>《唐六典》卷三 · 《唐律疏议》卷八、二十六</div>
      <div style={{fontSize: 18, opacity: .75, marginTop: 12}}>所据文本：Kanripo 古籍数据库<br/>完整出处、原文与推演边界见随片资料。</div>
    </div> : null}
    <div style={{position: 'absolute', bottom: 0, height: 4, left: 0, width: `${(test ? frame / 239 : frame / 1799) * 100}%`, background: '#cda96b'}}/>
    <AbsoluteFill style={{background: '#17241c', opacity: fade, pointerEvents: 'none'}}/>
  </AbsoluteFill>;
};
