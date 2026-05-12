"use client";

import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { MechanismScores } from "@/lib/prism-data";

export type MechanismSpacePoint = {
  label: string;
  scores: MechanismScores;
  color: string;
  size?: number;
};

type MechanismSpaceProps = {
  points: MechanismSpacePoint[];
};

const COLORS = {
  price: "#0f9f9a",
  access: "#d47a21",
  enforcement: "#be3455",
};

function Point({ point }: { point: MechanismSpacePoint }) {
  const position: [number, number, number] = [
    point.scores.price - 0.5,
    point.scores.enforcement - 0.5,
    point.scores.access - 0.5,
  ];

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[point.size ?? 0.032, 28, 28]} />
        <meshStandardMaterial
          color={point.color}
          roughness={0.34}
          metalness={0.08}
        />
      </mesh>
      <Html distanceFactor={18} position={[0.03, 0.03, 0]}>
        <div className="origin-top-left scale-[0.24] whitespace-nowrap rounded-sm border border-white/45 bg-white/88 px-1.5 py-0.5 text-[8px] font-semibold text-slate-900 shadow-sm">
          {point.label}
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
        distanceFactor={18}
        position={[
          position[0] + scale[0] / 2 + 0.04,
          position[1] + scale[1] / 2 + 0.04,
          position[2] + scale[2] / 2 + 0.04,
        ]}
      >
        <div className="origin-top-left scale-[0.17] whitespace-nowrap rounded-sm bg-slate-950/80 px-1.5 py-0.5 text-[8px] font-medium text-white">
          {label}
        </div>
      </Html>
    </group>
  );
}

export function MechanismSpace({ points }: MechanismSpaceProps) {
  return (
    <div className="h-[25rem] overflow-hidden rounded-lg border bg-[#f8fbfa] shadow-inner lg:h-[26rem]">
      <Canvas
        camera={{ position: [1.72, 1.34, 2.06], fov: 41 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#f8fbfa"]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <group rotation={[0, -0.22, 0]}>
          <Axis
            label="Price"
            color={COLORS.price}
            position={[0, -0.5, -0.5]}
            scale={[1.08, 0.015, 0.015]}
          />
          <Axis
            label="Enforcement"
            color={COLORS.enforcement}
            position={[-0.5, 0, -0.5]}
            scale={[0.015, 1.08, 0.015]}
          />
          <Axis
            label="Access"
            color={COLORS.access}
            position={[-0.5, -0.5, 0]}
            scale={[0.015, 0.015, 1.08]}
          />
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#d9e7e1"
              transparent
              opacity={0.1}
              wireframe
            />
          </mesh>
          {points.map((point) => (
            <Point key={`${point.label}-${point.color}`} point={point} />
          ))}
        </group>
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.22}
          enableDamping
          enablePan={false}
          maxDistance={5}
          minDistance={1.55}
        />
      </Canvas>
    </div>
  );
}
