import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, useConvexPolyhedron, usePlane } from "@react-three/cannon";

/** ========= Util: extrai vértices/faces/normais de uma geometria ========= */
function extractConvexFromGeometry(src: THREE.BufferGeometry) {
  const geom = src.index ? src.toNonIndexed() : src;
  geom.computeVertexNormals();

  const pos = geom.getAttribute("position") as THREE.BufferAttribute | null;
  if (!pos) throw new Error("Icosahedron geometry has no 'position' attribute.");

  const vertices: [number, number, number][] = [];
  for (let i = 0; i < pos.count; i++) {
    vertices.push([pos.getX(i), pos.getY(i), pos.getZ(i)]);
  }

  const faces: number[][] = [];
  for (let i = 0; i < pos.count; i += 3) faces.push([i, i + 1, i + 2]);

  const faceNormals: THREE.Vector3[] = [];
  const faceCentroids: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
    const c = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    faceNormals.push(n);
    faceCentroids.push(new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3));
  }

  return { vertices, faces, faceNormals, faceCentroids };
}

/** ========= Error Boundary simples ========= */
type EBProps = { children: React.ReactNode; fallback?: React.ReactNode };
type EBState = { hasError: boolean; error?: Error };

export class DiceErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("DiceErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="p-4 text-center">
            <p className="mb-2">Ops, houve um problema ao renderizar o dado.</p>
            <p className="text-xs text-white/60">{this.state.error?.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

/** ========= D20 físico ========= */
const D20: React.FC<{
  color?: string;
  faceMap?: (faceIndex: number) => number; // mapeia índice de face -> valor (ex: espelhar backend)
  onAsleep?: (value: number) => void;     // chamado quando o dado “dorme”
  rollingTrigger: number;                 // incrementar para iniciar rolagem
}> = ({ color = "#FFD700", faceMap, onAsleep, rollingTrigger }) => {
  const geom = useMemo<THREE.BufferGeometry>(() => new THREE.IcosahedronGeometry(1, 0), []);
  const { vertices, faces, faceNormals } = useMemo(() => extractConvexFromGeometry(geom), [geom]);

  // Corpo físico
  const [ref, api] = useConvexPolyhedron(
    () => ({
      args: [vertices, faces, [], []],
      mass: 1,
      position: [0, 5, 0],
      rotation: [0, 0, 0],
      allowSleep: true,
    }),
    undefined,
    [vertices, faces]
  );

  // Roll sempre que trigger mudar
  useEffect(() => {
    // reseta resultado físico
    (api as any)?.wakeUp?.();
    api.position.set(0, 3 + Math.random() * 1.5, 0);
    api.velocity.set((Math.random() - 0.5) * 6, 4 + Math.random() * 2, (Math.random() - 0.5) * 6);
    api.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  }, [rollingTrigger, api]);

  // Ao “dormir”, detectar a face voltada para cima
  const normalMatrix = useRef(new THREE.Matrix3());
  const findFaceUp = useCallback(() => {
    const obj = (ref as React.MutableRefObject<THREE.Mesh | null>).current;
    if (!obj) return;
    obj.updateWorldMatrix(true, false);
    normalMatrix.current.getNormalMatrix(obj.matrixWorld);
    const up = new THREE.Vector3(0, 1, 0);

    let bestI = 0;
    let bestDot = -Infinity;
    for (let i = 0; i < faceNormals.length; i++) {
      const n = faceNormals[i].clone().applyMatrix3(normalMatrix.current).normalize();
      const d = n.dot(up);
      if (d > bestDot) {
        bestDot = d;
        bestI = i;
      }
    }
    const value = faceMap ? faceMap(bestI) : bestI + 1; // fallback simples
    onAsleep?.(value);
  }, [faceNormals, faceMap, onAsleep, ref]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // Algumas versões expõem api.sleep; em outras, pode ser undefined.
    const sleepProp: any = (api as any)?.sleep;
    if (sleepProp && typeof sleepProp.subscribe === "function") {
      unsubs.push(
        sleepProp.subscribe((isSleeping: boolean) => {
          if (isSleeping) findFaceUp();
        })
      );
    } else {
      // Fallback: após 1.2s do roll, tenta ler a face para cima
      // (caso sua versão do cannon não exponha sleep subscription)
      const t = setTimeout(findFaceUp, 1200);
      unsubs.push(() => clearTimeout(t));
    }

    return () => {
      for (const u of unsubs) try { u(); } catch {}
    };
  }, [api, findFaceUp]);

  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
    </mesh>
  );
};

/** ========= Chão (corpo físico + visual) ========= */
const Floor: React.FC = () => {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }));
  return (
    <mesh ref={ref as any} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[6, 64]} />
      <meshStandardMaterial color="#111111" roughness={0.95} metalness={0.1} />
    </mesh>
  );
};

/** ========= Overlay com Canvas ========= */
export function DiceD20OverlayPhysics({
  open,
  onClose,
  onResult,
  faceMap,
  color = "#FFD700",
  title = "Limite da rodada",
  rollLabel = "Rolar",
}: {
  open: boolean;
  onClose: () => void;
  onResult?: (n: number) => void;
  faceMap?: (faceIndex: number) => number;
  color?: string;
  title?: string;
  rollLabel?: string;
}) {
  const [trigger, setTrigger] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const roll = useCallback(() => {
    setResult(null);
    setTrigger((t) => t + 1);
  }, []);

  // Auto-roll ao abrir
  useEffect(() => {
    if (open) roll();
  }, [open, roll]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[min(92vw,1000px)] h-[min(82vh,640px)] rounded-2xl border border-[#FFD700]/40 bg-black/85 shadow-2xl overflow-hidden">
        {/* Topbar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 border-b border-white/10 z-10">
          <span className="text-white/80 text-sm">{title}</span>
          <div className="flex items-center gap-3">
            {result !== null && <span className="text-[#FFD700] font-bold">Resultado: {result}</span>}
            <button onClick={roll} className="px-3 py-1 rounded-md bg-[#FFD700] text-black hover:bg-[#FFD700]/80">
              {rollLabel}
            </button>
            <button onClick={onClose} className="px-3 py-1 rounded-md border border-white/20 text-white hover:bg-white/10">
              Fechar
            </button>
          </div>
        </div>

        {/* Canvas */}
        <DiceErrorBoundary>
          <Canvas shadows camera={{ position: [0, 8, 12], fov: 50 }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[6, 10, 6]} intensity={1.1} castShadow />
            <Physics gravity={[0, -9.82, 0]} allowSleep>
              <Floor />
              <D20
                color={color}
                faceMap={faceMap}
                rollingTrigger={trigger}
                onAsleep={(n) => {
                  setResult(n);
                  onResult?.(n);
                }}
              />
            </Physics>
            <OrbitControls enableDamping />
          </Canvas>
        </DiceErrorBoundary>
      </div>
    </div>
  );
}

/** ========= Botão opcional ========= */
export const DiceD20ButtonPhysics: React.FC<{
  onResult?: (n: number) => void;
  color?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
  faceMap?: (faceIndex: number) => number;
}> = ({ onResult, color, className = "", label = "D20", disabled, faceMap }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`px-4 py-2 rounded-md border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black disabled:opacity-40 ${className}`}
      >
        {label}
      </button>
      <DiceD20OverlayPhysics
        open={open}
        onClose={() => setOpen(false)}
        onResult={onResult}
        color={color}
        faceMap={faceMap}
      />
    </>
  );
};
