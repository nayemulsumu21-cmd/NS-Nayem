import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DimensionalStudioStageProps {
  pointer: { x: number; y: number };
}

const DimensionalStudioStage: React.FC<DimensionalStudioStageProps> = ({
  pointer,
}) => {
  const stageGroupRef = useRef<THREE.Group>(null);
  const leftPrismRef = useRef<THREE.Mesh>(null);
  const rightGlassRef = useRef<THREE.Mesh>(null);
  const topSphereRef = useRef<THREE.Mesh>(null);
  const pedestalArcRef = useRef<THREE.Mesh>(null);
  const keyLightRef = useRef<THREE.PointLight>(null);

  // Soft Brushed Dark Slate-Indigo Metallic Surface matching portrait shirt tones (#17121F / #312B47)
  const darkMetalMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#17121F'),
        metalness: 0.9,
        roughness: 0.24,
        clearcoat: 0.65,
        clearcoatRoughness: 0.18,
        reflectivity: 0.9,
      }),
    []
  );

  // Subtle Periwinkle-Tinted Glass / Acrylic Dimensional Object (#344975)
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#344975'),
        metalness: 0.15,
        roughness: 0.12,
        transmission: 0.65,
        thickness: 1.4,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.78,
      }),
    []
  );

  // Satin Orchid-Plum Metallic Accent Material (#643179)
  const orchidAlloyMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#5C4577'),
        metalness: 0.82,
        roughness: 0.28,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
      }),
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (stageGroupRef.current) {
      stageGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        stageGroupRef.current.rotation.y,
        pointer.x * 0.16,
        0.045
      );
      stageGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        stageGroupRef.current.rotation.x,
        -pointer.y * 0.1,
        0.045
      );
    }

    if (leftPrismRef.current) {
      leftPrismRef.current.position.y = -1.05 + Math.sin(t * 0.75) * 0.12;
      leftPrismRef.current.rotation.x = 0.4 + Math.sin(t * 0.45) * 0.12;
      leftPrismRef.current.rotation.y = 0.5 + t * 0.14;
    }

    if (rightGlassRef.current) {
      rightGlassRef.current.position.y = 1.15 + Math.cos(t * 0.65) * 0.14;
      rightGlassRef.current.rotation.x = -0.35 + Math.cos(t * 0.4) * 0.1;
      rightGlassRef.current.rotation.z = 0.25 + t * 0.11;
    }

    if (topSphereRef.current) {
      topSphereRef.current.position.y = -1.35 + Math.sin(t * 0.8 + 1.2) * 0.1;
    }

    if (pedestalArcRef.current) {
      pedestalArcRef.current.rotation.z = Math.sin(t * 0.3) * 0.06;
    }

    if (keyLightRef.current) {
      keyLightRef.current.position.x = THREE.MathUtils.lerp(
        keyLightRef.current.position.x,
        pointer.x * 3.5,
        0.06
      );
      keyLightRef.current.position.y = THREE.MathUtils.lerp(
        keyLightRef.current.position.y,
        pointer.y * 2.2 + 0.6,
        0.06
      );
    }
  });

  return (
    <group ref={stageGroupRef}>
      {/* Interactive Atmospheric Studio Rim Light (Warm Rose-Amber from Portrait) */}
      <pointLight
        ref={keyLightRef}
        position={[0, 0.8, 3.2]}
        intensity={3.8}
        distance={11}
        color="#f1b39c"
      />

      {/* Subtle Grounded Solid Metallic Arch Pedestal Behind Center Stage */}
      <mesh
        ref={pedestalArcRef}
        position={[0, -2.55, -1.6]}
        rotation={[Math.PI * 0.44, 0, 0]}
        material={darkMetalMaterial}
      >
        <torusGeometry args={[2.9, 0.16, 48, 120]} />
      </mesh>

      {/* Left Foreground/Midground Solid Beveled Metallic Octahedron */}
      <mesh
        ref={leftPrismRef}
        position={[-3.35, -1.05, -0.8]}
        material={darkMetalMaterial}
      >
        <octahedronGeometry args={[0.42, 0]} />
      </mesh>

      {/* Right Upper Subtle Glass-Like Dimensional Capsule/Torus */}
      <mesh
        ref={rightGlassRef}
        position={[3.45, 1.15, -0.7]}
        material={glassMaterial}
      >
        <torusGeometry args={[0.38, 0.13, 36, 72]} />
      </mesh>

      {/* Right Lower Solid Satin Slate-Orchid Sphere */}
      <mesh
        ref={topSphereRef}
        position={[3.05, -1.35, -1.1]}
        material={orchidAlloyMaterial}
      >
        <sphereGeometry args={[0.24, 48, 48]} />
      </mesh>
    </group>
  );
};

interface Hero3DStageProps {
  pointer: { x: number; y: number };
  reducedMotion?: boolean;
}

export const Hero3DStage: React.FC<Hero3DStageProps> = ({
  pointer,
  reducedMotion = false,
}) => {
  if (reducedMotion) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] opacity-95"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 6.0], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.6} />
        {/* Left Orchid Rim Light matching portrait left spotlight */}
        <directionalLight
          position={[-4, 5, 4]}
          intensity={2.4}
          color="#b86bd4"
        />
        {/* Right Periwinkle Blue Key Light matching portrait right spotlight */}
        <directionalLight
          position={[5, -3, 3]}
          intensity={2.2}
          color="#7ca6e8"
        />
        <pointLight position={[0, 2.2, -1.5]} intensity={2.6} color="#5c4577" />
        <DimensionalStudioStage pointer={pointer} />
      </Canvas>
    </div>
  );
};
