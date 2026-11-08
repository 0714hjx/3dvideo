import React, {useMemo} from 'react';
import {useLoader} from '@react-three/fiber';
import {staticFile} from 'remotion';
import * as THREE from 'three';

export const Box: React.FC<{p: [number, number, number]; s: [number, number, number]; color?: string; material?: THREE.Material; shadow?: boolean}> = ({p, s, color = '#947557', material, shadow = true}) => (
  <mesh position={p} scale={s} castShadow={shadow} receiveShadow>
    <boxGeometry args={[1, 1, 1]} />
    {material ? <primitive object={material} attach="material" /> : <meshStandardMaterial color={color} roughness={0.95} />}
  </mesh>
);

export const useMaterials = () => {
  const maps = useLoader(THREE.TextureLoader, ['earth.jpg', 'earth-bump.jpg', 'wood.jpg', 'wood-bump.jpg', 'tile.jpg', 'tile-bump.jpg', 'ground.jpg', 'ground-bump.jpg'].map(n => staticFile(`changan/${n}`)));
  return useMemo(() => {
    maps.forEach((t, i) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      if (i % 2 === 0) t.colorSpace = THREE.SRGBColorSpace;
    });
    maps[0].repeat.set(4, 1); maps[1].repeat.set(4, 1);
    maps[6].repeat.set(28, 28); maps[7].repeat.set(28, 28);
    return {
      earth: new THREE.MeshStandardMaterial({map: maps[0], bumpMap: maps[1], bumpScale: .065, roughness: 1}),
      wood: new THREE.MeshStandardMaterial({map: maps[2], bumpMap: maps[3], bumpScale: .035, roughness: .86}),
      roof: new THREE.MeshStandardMaterial({map: maps[4], bumpMap: maps[5], bumpScale: .045, roughness: .9, side: THREE.DoubleSide}),
      ground: new THREE.MeshStandardMaterial({map: maps[6], bumpMap: maps[7], bumpScale: .08, roughness: 1}),
    };
  }, [maps]);
};

export type Materials = ReturnType<typeof useMaterials>;

// A gently curved hipped roof: ridge along X; measured in metres in the street scene.
export const roofGeometry = (w: number, d: number, rise: number, segments = 16, rows = 10) => {
  const vertices: number[] = [], uvs: number[] = [];
  const ridge = w * .29;
  const surface = (side: number, u: number, t: number): THREE.Vector3 => {
    const y = rise * Math.pow(1 - t, 1.6) + .11 * Math.pow(t, 10);
    if (side < 2) return new THREE.Vector3((u * 2 - 1) * (ridge + (w / 2 - ridge) * t), y, (side === 0 ? 1 : -1) * d / 2 * t);
    return new THREE.Vector3((side === 2 ? 1 : -1) * (ridge + (w / 2 - ridge) * t), y, (u * 2 - 1) * d / 2 * t);
  };
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < segments; i++) for (let j = 0; j < rows; j++) {
      const corners = [[i / segments, j / rows], [(i + 1) / segments, j / rows], [(i + 1) / segments, (j + 1) / rows], [i / segments, (j + 1) / rows]];
      for (const k of [0, 2, 1, 0, 3, 2]) {
        const [u, t] = corners[k]; const p = surface(side, u, t);
        vertices.push(p.x, p.y, p.z); uvs.push(u * (side < 2 ? w : d) / .26, t * d / 2 / .34);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.computeVertexNormals();
  return geo;
};

export const Roof: React.FC<{w: number; d: number; y: number; rise?: number; mat: Materials}> = ({w, d, y, rise = 1.45, mat}) => {
  const geo = useMemo(() => roofGeometry(w, d, rise), [w, d, rise]);
  return <group position={[0, y, 0]}>
    <mesh geometry={geo} material={mat.roof} castShadow receiveShadow />
    <Box p={[0, rise + .035, 0]} s={[w * .59, .15, .18]} color="#66685e" />
    {[-1, 1].map(a => <React.Fragment key={a}>
      <Box p={[0, -.04, a * d / 2]} s={[w, .16, .16]} material={mat.wood} />
      <Box p={[a * w / 2, -.04, 0]} s={[.16, .16, d]} material={mat.wood} />
    </React.Fragment>)}
  </group>;
};

export const House: React.FC<{x: number; z: number; mat: Materials; w?: number; d?: number; turn?: number}> = ({x, z, mat, w = 9, d = 6, turn = 0}) => <group position={[x, 0, z]} rotation={[0, turn, 0]}>
  <Box p={[0, .18, 0]} s={[w + 1, .36, d + .9]} color="#8c8878" />
  <Box p={[0, 1.85, 0]} s={[w, 3.2, d]} material={mat.earth} />
  <Box p={[0, 1.65, d / 2 + .02]} s={[1.55, 2.7, .13]} material={mat.wood} />
  {[-1, 1].map(side => <React.Fragment key={side}>
    <Box p={[side * w * .29, 2.05, d / 2 + .04]} s={[1.5, 1.35, .12]} color="#393d32" />
    {[0, 1, 2, 3, 4].map(k => <Box key={k} p={[side * w * .29 - .65 + k * .325, 2.05, d / 2 + .11]} s={[.055, 1.35, .055]} material={mat.wood} shadow={false} />)}
  </React.Fragment>)}
  {[-w / 2 + .2, 0, w / 2 - .2].map(px => <Box key={px} p={[px, 1.9, d / 2 + .45]} s={[.28, 3.5, .28]} material={mat.wood} />)}
  <Box p={[0, 3.45, d / 2 + .45]} s={[w + .3, .25, .32]} material={mat.wood} />
  <Roof w={w + 2.1} d={d + 2.5} y={3.65} mat={mat} />
</group>;

export const Gate: React.FC<{mat: Materials; close?: number}> = ({mat, close = 0}) => <group>
  {[-1, 1].map(side => <React.Fragment key={side}>
    <Box p={[side * 22, 1.65, 0]} s={[38, 3.3, 1.3]} material={mat.earth} />
    <Box p={[side * 22, 3.34, 0]} s={[38.3, .13, 1.48]} color="#8f856c" />
    <Box p={[side * 2.75, .18, 0]} s={[.82, .36, .82]} color="#928b79" />
    {[-1.85, 1.85].map(z => <Box key={z} p={[side * 2.75, 2.25, z]} s={[.48, 4.5, .48]} material={mat.wood} />)}
    <Box p={[side * 2.75, 4.35, 0]} s={[.45, .36, 5.2]} material={mat.wood} />
    <group position={[side * 2.48, 0, -1.85]} rotation={[0, -side * (1 - close) * Math.PI / 2, 0]}>
      <Box p={[-side * 1.24, 2.1, 0]} s={[2.48, 4.1, .16]} material={mat.wood} />
      {[1, 2.8].map(y => <Box key={y} p={[-side * 1.24, y, .1]} s={[2.35, .12, .1]} color="#49392b" />)}
      <mesh position={[-side * .28, 1.9, .15]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.1, .025, 6, 12]} /><meshStandardMaterial color="#82724d" metalness={.6} roughness={.6}/></mesh>
    </group>
  </React.Fragment>)}
  <Box p={[0, 4.35, 0]} s={[6, .52, 4.3]} material={mat.wood} />
  {[-2.5, -1.25, 0, 1.25, 2.5].map(x => <group key={x}>
    <Box p={[x, 4.6, 0]} s={[.18, .24, 5.6]} material={mat.wood} />
    <Box p={[x, 4.82, 0]} s={[.8, .17, 4.8]} material={mat.wood} />
  </group>)}
  <Roof w={9.4} d={7} y={4.95} rise={1.6} mat={mat} />
  <Box p={[0, .035, 0]} s={[5, .07, 4.1]} color="#99917c" />
</group>;

const Tree: React.FC<{x: number; z: number; scale?: number}> = ({x, z, scale = 1}) => <group position={[x, 0, z]} scale={scale}>
  <mesh position={[0, 2.5, 0]} castShadow><cylinderGeometry args={[.12, .24, 5, 7]} /><meshStandardMaterial color="#625442" /></mesh>
  <instancedMesh args={[undefined, undefined, 120]} castShadow ref={m => {
    if (!m) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 120; i++) {
      const a = i * 2.399963; const r = 2.5 * Math.sqrt((i % 31) / 31);
      dummy.position.set(Math.cos(a) * r, 4.9 + 1.25 * Math.sin(i * 1.71) - r * .13, Math.sin(a) * r);
      const s = .55 + .22 * Math.sin(i * 1.49);
      dummy.scale.set(s, s * .8, s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, new THREE.Color(['#4b5a35', '#687345', '#79804b', '#586540'][i % 4]));
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }}><icosahedronGeometry args={[1, 1]}/><meshStandardMaterial roughness={1}/></instancedMesh>
</group>;

const Person: React.FC<{x: number; z: number; color: string; turn?: number}> = ({x, z, color, turn = 0}) => <group position={[x, 0, z]} rotation={[0, turn, 0]}>
  <mesh position={[0, .75, 0]} castShadow><cylinderGeometry args={[.19, .31, 1.1, 10]} /><meshStandardMaterial color={color} roughness={1}/></mesh>
  <mesh position={[0, 1.48, 0]} castShadow><sphereGeometry args={[.14, 10, 8]} /><meshStandardMaterial color="#ae8a62" roughness={1}/></mesh>
  <Box p={[0, 1.59, 0]} s={[.25, .13, .24]} color="#35372b" />
  {[-1, 1].map(s => <React.Fragment key={s}><mesh position={[s * .22, 1.02, 0]} rotation={[0, 0, s * .12]} castShadow><cylinderGeometry args={[.12, .08, .57, 10]}/><meshStandardMaterial color={color}/></mesh><Box p={[s * .12, .12, .05]} s={[.16, .24, .28]} color="#403e32"/></React.Fragment>)}
</group>;

export const Street: React.FC<{close?: number}> = React.memo(({close = 0}) => {
  const mat = useMaterials();
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[240, 240]}/><primitive object={mat.ground} attach="material" /></mesh>
    <Gate mat={mat} close={close} />
    {/* Interior lane: a continuous free corridor x=(-3,3), running through the gate. */}
    {[-1, 1].map(s => <React.Fragment key={s}>
      <Box p={[s * 14, 1.25, -18]} s={[1, 2.5, 34]} material={mat.earth} />
      {[-13, -27, -43, -59, -77].map((z, i) => <House key={z} x={s * (i % 2 ? 21 : 20)} z={z} mat={mat} w={10} d={7} turn={s * Math.PI / 2} />)}
      <House x={s * 19} z={19} mat={mat} w={12} d={7} turn={Math.PI}/>
      <House x={s * 34} z={-10} mat={mat} w={12} d={8}/>
      <House x={s * 32} z={-38} mat={mat} w={13} d={8}/>
      {[-4, -24, -49].map(z => <Tree key={z} x={s * 10} z={z} scale={.95} />)}
      <Box p={[s * 6.7, .035, -35]} s={[.35, .07, 66]} color="#867d67" shadow={false}/>
      <Box p={[s * 6.7, .035, 18]} s={[.35, .07, 32]} color="#867d67" shadow={false}/>
    </React.Fragment>)}
    <House x={0} z={-95} mat={mat} w={18} d={8}/>
    <Person x={4.6} z={-11} color="#535f52" turn={.4}/>
    <Person x={-5.4} z={-22} color="#96734f" turn={-.2}/>
    <Person x={7.8} z={-7} color="#746653" turn={2}/>
    <Person x={4.8} z={-37} color="#7e594b"/>
    <Box p={[-8, .32, -7]} s={[1.7, .64, .75]} color="#7a6445"/>
    <Box p={[-8, .7, -7]} s={[1.9, .15, .9]} color="#807655"/>
    <Tree x={-23} z={8}/>
  </group>;
});

// A schematic of the outer city: historical relations, deliberately merged wards.
export const City: React.FC = React.memo(() => {
  const blocks = useMemo(() => {
    const items: {x: number; z: number; w: number; d: number}[] = [];
    for (let col = 0; col < 10; col++) for (let row = 0; row < 11; row++) {
      const x = (col - 4.5) * 9.1, z = -37 + row * 7.3;
      if (Math.abs(x) < 14 && z < -10) continue;
      if ((col === 2 || col === 7) && (row === 4 || row === 5)) continue;
      // The southeastern Qujiang area remains a park-like open sector.
      if (col > 7 && row > 8) continue;
      items.push({x, z, w: 7.6, d: 6.1});
    }
    return items;
  }, []);
  const roofs = useMemo(() => {
    const g = roofGeometry(1.75, 1.35, .45, 2, 2); return g;
  }, []);
  const buildings = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    blocks.forEach(b => {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        matrices.push(new THREE.Matrix4().makeTranslation(b.x + (i - 1) * 2.15, .65, b.z + (j - 1) * 1.68));
      }
    }); return matrices;
  }, [blocks]);
  const fillInstances = (m: THREE.InstancedMesh | null) => {if (m) {buildings.forEach((v, i) => m.setMatrixAt(i, v)); m.instanceMatrix.needsUpdate = true;}};
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[2000, 2000]}/><meshStandardMaterial color="#b7ac8e" roughness={1}/></mesh>
    <Box p={[0, .03, 0]} s={[98, .06, 87]} color="#d0ba91" shadow={false}/>
    {blocks.map((b, i) => <group key={i}>
      <Box p={[b.x, .13, b.z]} s={[b.w, .2, b.d]} color={i % 3 === 0 ? '#a4a07f' : '#b6a37f'} shadow={false}/>
      {[-1, 1].map(s => <React.Fragment key={s}>
        <Box p={[b.x + s * b.w / 2, .48, b.z]} s={[.12, .75, b.d]} color="#aa9069"/>
        <Box p={[b.x, .48, b.z + s * b.d / 2]} s={[b.w, .75, .12]} color="#aa9069"/>
      </React.Fragment>)}
    </group>)}
    <instancedMesh ref={fillInstances} args={[roofs, undefined, buildings.length]} castShadow receiveShadow><meshStandardMaterial color="#72766c" side={THREE.DoubleSide} roughness={.96}/></instancedMesh>
    {/* Taiji palace city in the north; the imperial city immediately south. */}
    <Box p={[0, .18, -33]} s={[28, .3, 18]} color="#b58e6c"/>
    <Box p={[0, .16, -17.5]} s={[28, .27, 12]} color="#c0a384"/>
    {[-1, 1].map(s => <React.Fragment key={s}>
      <Box p={[s * 14, .8, -26]} s={[.3, 1.5, 32]} color="#9d7353"/>
      <Box p={[0, .8, s === 1 ? -11 : -42]} s={[28, 1.5, .3]} color="#9d7353"/>
      <Box p={[s * 48.5, .6, 0]} s={[.4, 1.2, 86]} color="#a08a66"/>
      <Box p={[0, .6, s * 43]} s={[97, 1.2, .4]} color="#a08a66"/>
    </React.Fragment>)}
    {[-35, -29, -23].map(z => <group key={z} position={[0, .2, z]}>
      <Box p={[0, .9, 0]} s={[9, 1.5, 3]} color="#967052"/>
      <mesh position={[0, 1.7, 0]} geometry={roofGeometry(10.5, 4.5, 1.1, 4, 3)} castShadow><meshStandardMaterial color="#5f6c61" side={THREE.DoubleSide}/></mesh>
    </group>)}
    {[-22.75, 22.75].map(x => <group key={x} position={[x, 0, -4.15]}>
      <Box p={[0, .16, 0]} s={[7.6, .3, 13.4]} color="#ac9770"/>
      {[-4, -1, 2, 5].map(z => <group key={z}>
        {[-1.8, 1.8].map(a => <Box key={a} p={[a, .65, z]} s={[2.3, .8, 1.2]} color="#73776a"/>)}
      </group>)}
    </group>)}
    {/* Zhuque Street deliberately wider for legibility in this schematic. */}
    <Box p={[0, .12, 16]} s={[2, .08, 54]} color="#decb9b" shadow={false}/>
    <Box p={[0, .65, 43]} s={[3, 1.3, 1]} color="#8f795b"/>
  </group>;
});
