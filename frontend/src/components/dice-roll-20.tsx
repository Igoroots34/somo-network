import React, { useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/** --- D20 3D Mesh --- */
const D20Mesh: React.FC<{
  color?: string;
  rolling: boolean;
  onStop?: () => void;
}> = ({ color = "#FFD700", rolling, onStop }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const velRef = useRef(new THREE.Vector3(0, 0, 0));
  const activeRef = useRef(false);

  // inicia uma rolagem com velocidade aleatória
  const start = () => {
    velRef.current.set(
      (Math.random() - 0.5) * 1.8,
      (Math.random() - 0.5) * 1.8,
      (Math.random() - 0.5) * 1.8
    );
    activeRef.current = true;
  };

  // se a prop "rolling" ligar, dispara um start
  React.useEffect(() => {
    if (rolling) start();
  }, [rolling]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || !activeRef.current) return;

    mesh.rotation.x += velRef.current.x;
    mesh.rotation.y += velRef.current.y;
    mesh.rotation.z += velRef.current.z;

    // atrito
    velRef.current.multiplyScalar(0.965);

    if (
      Math.abs(velRef.current.x) < 0.01 &&
      Math.abs(velRef.current.y) < 0.01 &&
      Math.abs(velRef.current.z) < 0.01
    ) {
      activeRef.current = false;
      onStop?.();
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} metalness={0.6} roughness={0.35} />
    </mesh>
  );
};

/** --- Overlay completo com Canvas --- */
export const DiceOverlay: React.FC<{
  /** controla visibilidade do modal */
  open: boolean;
  /** fecha o modal */
  onClose: () => void;
  /** recebe o resultado (1..20) quando a rolagem termina */
  onResult?: (n: number) => void;
  /** cor do dado (default: #FFD700) */
  color?: string;
  /** título do overlay */
  title?: string;
  /** texto do botão rolar */
  rollLabel?: string;
}> = ({
  open,
  onClose,
  onResult,
  color = "#FFD700",
  title = "D20 Roller",
  rollLabel = "Rolar",
}) => {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const roll = () => {
    setResult(null);
    setRolling(false);
    // força um toggle pra reiniciar animação no D20Mesh
    requestAnimationFrame(() => setRolling(true));
  };

  const handleStop = () => {
    const n = Math.floor(Math.random() * 20) + 1;
    setResult(n);
    onResult?.(n);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[min(92vw,900px)] h-[min(80vh,600px)] rounded-2xl border border-[#FFD700]/40 bg-black/80 shadow-2xl">
        {/* Topbar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 border-b border-white/10">
          <span className="text-white/80 text-sm">{title}</span>
          <div className="flex items-center gap-2">
            {result !== null && (
              <span className="text-[#FFD700] font-bold">Resultado: {result}</span>
            )}
            <button
              onClick={roll}
              className="px-3 py-1 rounded-md bg-[#FFD700] text-black hover:bg-[#FFD700]/80"
            >
              {rollLabel}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="absolute inset-0 pt-10 pb-2">
          <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 6, 5]} intensity={1.1} />
            <OrbitControls enableDamping />
            <D20Mesh color={color} rolling={rolling} onStop={handleStop} />
            {/* Piso sutil */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]}>
              <circleGeometry args={[5, 64]} />
              <meshStandardMaterial color="#111111" metalness={0.2} roughness={0.9} />
            </mesh>
          </Canvas>
        </div>
      </div>
    </div>
  );
};

/** --- Botão que já gerencia o overlay internamente (opcional) --- */
export const DiceRollerButton: React.FC<{
  onResult?: (n: number) => void;
  color?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}> = ({ onResult, color, label = "D20", className = "", disabled }) => {
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
      <DiceOverlay
        open={open}
        onClose={() => setOpen(false)}
        onResult={onResult}
        color={color}
      />
    </>
  );
};
