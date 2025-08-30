// src/components/dice-bounce-card.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Text } from "@react-three/drei";
import { Physics, useConvexPolyhedron, usePlane } from "@react-three/cannon";

/* ====================== Utils ====================== */

// Constrói shape convexo (vértices/faces) de uma geometria triangulada
function convexFromGeometry(src: THREE.BufferGeometry) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  const pos = g.getAttribute("position") as THREE.BufferAttribute | null;
  if (!pos) throw new Error("Geometria sem position.");
  const vertices: [number, number, number][] = [];
  for (let i = 0; i < pos.count; i++) {
    vertices.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
  }
  // Cada 3 vértices formam uma face triangular
  const faces: number[][] = [];
  for (let i = 0; i < pos.count; i += 3) faces.push([i, i + 1, i + 2]);
  return { vertices, faces };
}

// Centro + normal para detectar a face de cima
function faceData(src: THREE.BufferGeometry) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const out: { center: THREE.Vector3; normal: THREE.Vector3 }[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    b.set(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
    c.set(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
    const center = new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3);
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    out.push({ center, normal });
  }
  return out;
}

// Quat estável por face (evita "twist" aleatório do rótulo)
function stableFaceQuat(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  const z = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize(); // normal
  const x = new THREE.Vector3().subVectors(b, a).normalize(); // usa aresta AB como referência
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  return q;
}

/* ====================== Chão + Paredes ====================== */

function Floor({ y = -1.2, w = 11 , z = 10 }: { y?: number; w?: number; z?: number }) {
  const [ref] = usePlane(() => ({
    position: [0, y, 0],
    rotation: [-Math.PI / 2, 0, 0],
    type: "Static",
    material: { restitution: 0.2, friction: 0.9 },
  }));
  return (
    <mesh ref={ref as any} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[w, z]} />
      <meshStandardMaterial color="#000" roughness={0} metalness={0} />
    </mesh>
  );
}

function Walls({ w = 6, z = 4 }: { w?: number; z?: number }) {
  // esquerda/direita
  usePlane(() => ({ position: [-w / 2, 0, 0], rotation: [0, Math.PI / 2, 0], type: "Static", material: { restitution: 0.2, friction: 0.9 } }));
  usePlane(() => ({ position: [ w / 2, 0, 0], rotation: [0,-Math.PI / 2, 0], type: "Static", material: { restitution: 0.2, friction: 0.9 } }));
  // frente/trás
  usePlane(() => ({ position: [0, 0,  z / 2], rotation: [0, Math.PI, 0], type: "Static", material: { restitution: 0.2, friction: 0.9 } }));
  usePlane(() => ({ position: [0, 0, -z / 2], rotation: [0, 0, 0],       type: "Static", material: { restitution: 0.2, friction: 0.9 } }));
  return null;
}

/* ====================== D20 ====================== */

function D20Mesh({
  radius = 0.75,
  color = "#FFD700",
  targetValue,           // valor vindo do backend (round_limit)
  onRevealed,           // callback quando revelar (parou)
  rollTrigger = 0,       // incremente para rolar de novo
}: {
  radius?: number;
  color?: string;
  targetValue: number;                // <- obrigatório aqui
  onRevealed?: (n: number) => void;   // devolve o valor revelado (deve ser igual a targetValue)
  rollTrigger?: number;
}) {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(radius, 0), [radius]);
  const { vertices, faces } = useMemo(() => convexFromGeometry(geo), [geo]);
  const faceInfo = useMemo(() => faceData(geo), [geo]);
  const posAttr = useMemo(() => geo.getAttribute("position") as THREE.BufferAttribute, [geo]);

  const [ref, api] = useConvexPolyhedron(() => ({
    mass: 1,
    args: [vertices, faces],
    material: { restitution: 0.25, friction: 1 }, // menos pulo, mais atrito
    linearDamping: 0.1,
    angularDamping: 0.25,
    allowSleep: true,
    sleepSpeedLimit: 0.25,
    sleepTimeLimit: 0.2,
    position: [0, 0.6, 0],
  }));

  // rolar (chute inicial)
  const [reveal, setReveal] = useState(false);   // false: "?" em todas | true: só topo revela target
  const roll = useCallback(() => {
    setReveal(false);
    (api as any)?.wakeUp?.();
    api.position.set(0, 0.8, 0);
    api.velocity.set((Math.random() - 0.5) * 1.8, 3 + Math.random() * 1.2, (Math.random() - 0.5) * 1.8);
    api.angularVelocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    settledOnce.current = false;
    settleCounter.current = 0;
    setLockedFace(null);
  }, [api]);

  useEffect(() => { roll(); }, []);               // ao montar
  useEffect(() => { roll(); }, [rollTrigger, roll]); // re-roll programático

  // detectar face “para cima” continuamente
  const objectRef = ref as React.MutableRefObject<THREE.Mesh | null>;
  const normalMatrix = useRef(new THREE.Matrix3());
  const [faceUp, setFaceUp] = useState(0);
  const [lockedFace, setLockedFace] = useState<number | null>(null); // índice travado quando parar

  const pickFaceUp = useCallback(() => {
    const obj = objectRef.current;
    if (!obj) return 0;
    obj.updateWorldMatrix(true, false);
    normalMatrix.current.getNormalMatrix(obj.matrixWorld);
    const up = new THREE.Vector3(0, 1, 0);
    let bestI = 0, bestDot = -Infinity;
    for (let i = 0; i < faceInfo.length; i++) {
      const nWorld = faceInfo[i].normal.clone().applyMatrix3(normalMatrix.current).normalize();
      const d = nWorld.dot(up);
      if (d > bestDot) { bestDot = d; bestI = i; }
    }
    return bestI;
  }, [faceInfo, objectRef]);

  useFrame(() => {
    const i = pickFaceUp();
    if (i !== faceUp) setFaceUp(i);
  });

  // assinaturas de velocidade para detectar “assentou”
  const velRef = useRef<[number, number, number]>([0, 0, 0]);
  const angRef = useRef<[number, number, number]>([0, 0, 0]);
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const v = (api as any).velocity, w = (api as any).angularVelocity;
    if (v?.subscribe) unsubs.push(v.subscribe(([x, y, z]: number[]) => (velRef.current = [x, y, z])));
    if (w?.subscribe) unsubs.push(w.subscribe(([x, y, z]: number[]) => (angRef.current = [x, y, z])));
    return () => unsubs.forEach((u) => { try { u(); } catch {} });
  }, [api]);

  const settleCounter = useRef(0);
  const settledOnce = useRef(false);
  useFrame(() => {
    const [vx, vy, vz] = velRef.current;
    const [wx, wy, wz] = angRef.current;
    const vmag = Math.hypot(vx, vy, vz);
    const wmag = Math.hypot(wx, wy, wz);
    const V = 0.15, W = 0.35, FR = 28; // ~0.45s parado @60fps

    if (vmag < V && wmag < W) {
      settleCounter.current++;
      if (!settledOnce.current && settleCounter.current >= FR) {
        settledOnce.current = true;
        setReveal(true);              // agora revela
        setLockedFace(faceUp);        // trava qual índice estava por cima
        onRevealed?.(targetValue);    // devolve o valor (definido pelo backend)
      }
    } else {
      settleCounter.current = 0;
    }
  });

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.95,
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        reflectivity: 1,
      }),
    [color]
  );

  return (
    <group ref={ref as any}>
      <mesh geometry={geo} castShadow receiveShadow>
        <primitive object={material} attach="material" />
      </mesh>

      {/* contorno */}
      <lineSegments>
        <edgesGeometry args={[geo]} />
        <lineBasicMaterial linewidth={1} />
      </lineSegments>

      {/* rótulos nas faces:
          - enquanto rola: "?" em todas
          - quando parar: só a face "lockedFace" mostra targetValue; as outras permanecem "?" */}
      {faceInfo.map(({ center }, i) => {
        // pega os 3 vértices da face i para orientação estável
        const i0 = i * 3;
        const a = new THREE.Vector3(posAttr.getX(i0 + 0), posAttr.getY(i0 + 0), posAttr.getZ(i0 + 0));
        const b = new THREE.Vector3(posAttr.getX(i0 + 1), posAttr.getY(i0 + 1), posAttr.getZ(i0 + 1));
        const c = new THREE.Vector3(posAttr.getX(i0 + 2), posAttr.getY(i0 + 2), posAttr.getZ(i0 + 2));
        const quat = stableFaceQuat(a, b, c);

        const out = new THREE.Vector3(0, 0, 1).applyQuaternion(quat).multiplyScalar(0.02);
        const p = center.clone().add(out);

        const isTopFace = reveal && lockedFace === i;
        const label = isTopFace ? String(targetValue) : "?";

        return (
          <group key={i} position={[p.x, p.y, p.z]} quaternion={quat}>
            <Text
              fontSize={0.22}
              depthOffset={-0.1}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#111"
              color={isTopFace ? "#000" : "#333"}
            >
              {label}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

/* ====================== Cena (câmera aérea) ====================== */

function Scene({
  targetValue,
  onRevealed,
  rollTrigger,
}: {
  targetValue: number;
  onRevealed?: (n: number) => void;
  rollTrigger: number;
}) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} castShadow />
      <Environment preset="studio" />

      <Physics gravity={[0, -9.82, 0]} allowSleep>
        <Floor />
        <Walls />
        <D20Mesh targetValue={targetValue} onRevealed={onRevealed} rollTrigger={rollTrigger} />
      </Physics>
    </>
  );
}

/* ====================== Card + Canvas ====================== */
/**
 * targetValue: número do backend (ex.: room.round_limit)
 * externalTrigger: incremente para rolar automaticamente
 * interactive: se true, permite clique para rolar (default false: automático)
 */
export default function D20BounceCard({
  targetValue,
  onRevealed,
  externalTrigger = 0,
  interactive = false,
}: {
  targetValue: number;                   // <- obrigatório
  onRevealed?: (n: number) => void;
  externalTrigger?: number;
  interactive?: boolean;
}) {
  const [clicks, setClicks] = useState(0);
  const rollTrigger = externalTrigger + (interactive ? clicks : 0);

  return (
    <div
      className="relative rounded-2xl"
      style={{
        width: "100%",
        height: "100%",
        maxHeight: 520,
        maxWidth: 520,
        aspectRatio: "16 / 9",
        margin: "0 auto",
        padding: "1px",
        background: "linear-gradient(135deg, rgba(255,215,0,0.6), rgba(255,255,255,0.05))",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(255,215,0,0.15)",
        borderRadius: 12,
        cursor: interactive ? "pointer" : "default",
      }}
      onClick={interactive ? () => setClicks((c) => c + 1) : undefined}
      title={interactive ? "Clique para rolar novamente" : undefined}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "radial-gradient(120% 120% at 80% 0%, #1a1a1a 0%, #0d0d0d 60%, #060606 100%)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <Canvas
          shadows
          // câmera aérea (top-down)
          camera={{ position: [0, 6, 0.001], fov: 25, near: 0.1, far: 100 }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor("#000000", 0);
            camera.lookAt(0, 0, 0);
          }}
        >
          <Scene targetValue={targetValue} onRevealed={onRevealed} rollTrigger={rollTrigger} />
        </Canvas>

        {/* overlay sutil */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(255,215,0,0.15), inset 0 0 60px rgba(255,215,0,0.08)",
            borderRadius: 16,
          }}
        />
      </div>
    </div>
  );
}
