"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { MechanismScores } from "@/lib/prism-data";

type MechanismSpaceProps = {
  stateName: string;
  stateScores: MechanismScores;
  lawScores: MechanismScores;
  scenarioVector: MechanismScores;
};

const COLORS = {
  price: "#0f9f9a",
  access: "#d47a21",
  enforcement: "#be3455",
};

function Point({
  label,
  scores,
  color,
  size,
}: {
  label: string;
  scores: MechanismScores;
  color: string;
  size: number;
}) {
  const position: [number, number, number] = [
    scores.price - 0.5,
    scores.enforcement - 0.5,
    scores.access - 0.5,
  ];

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.08} />
      </mesh>
      <Html distanceFactor={14} position={[0.06, 0.06, 0]}>
        <div className="origin-top-left scale-[0.45] whitespace-nowrap rounded-sm border border-white/40 bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-900 shadow-sm">
          {label}
        </div>
      </Html>
    </group>
  );
}

function Axis({
  label,
  color,
  position,
  scale,
}: {
  label: string;
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
}) {
  return (
    <group>
      <mesh position={position}>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Html
        distanceFactor={14}
        position={[
          position[0] + scale[0] / 2 + 0.06,
          position[1] + scale[1] / 2 + 0.06,
          position[2] + scale[2] / 2 + 0.06,
        ]}
      >
        <div className="origin-top-left scale-[0.38] whitespace-nowrap rounded-sm bg-slate-950/85 px-2 py-1 text-[10px] font-medium text-white">
          {label}
        </div>
      </Html>
    </group>
  );
}

export function MechanismSpace({
  stateName,
  stateScores,
  lawScores,
  scenarioVector,
}: MechanismSpaceProps) {
  return (
    <div className="h-[22rem] overflow-hidden rounded-lg border bg-[#f8fbfa] shadow-inner">
      <Canvas
        camera={{ position: [1.8, 1.6, 2.0], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#f8fbfa"]} />
        <ambientLight intensity={0.72} />
        <directionalLight position={[2, 3, 4]} intensity={1.2} />
        <group rotation={[0, -0.25, 0]}>
          <Axis
            label="Price"
            color={COLORS.price}
            position={[0, -0.5, -0.5]}
            scale={[1.08, 0.018, 0.018]}
          />
          <Axis
            label="Enforcement"
            color={COLORS.enforcement}
            position={[-0.5, 0, -0.5]}
            scale={[0.018, 1.08, 0.018]}
          />
          <Axis
            label="Access"
            color={COLORS.access}
            position={[-0.5, -0.5, 0]}
            scale={[0.018, 0.018, 1.08]}
          />
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#d9e7e1"
              transparent
              opacity={0.12}
              wireframe
            />
          </mesh>
          <Point
            label={stateName}
            scores={stateScores}
            color="#254d74"
            size={0.055}
          />
          <Point
            label="Law"
            scores={lawScores}
            color="#be3455"
            size={0.07}
          />
          <Point
            label="Scenario"
            scores={scenarioVector}
            color="#0f9f9a"
            size={0.047}
          />
        </group>
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.35}
          enableDamping
          enablePan={false}
          maxDistance={5}
          minDistance={1.5}
        />
      </Canvas>
    </div>
  );
}
