"use client";

import { ContactShadows, OrbitControls, Sparkles } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { Mesh } from "three";
import * as THREE from "three";

type ReadinessSceneProps = {
  score: number;
};

type ReadinessOrbProps = {
  score: number;
};

function getScoreColor(score: number) {
  if (score < 50) {
    return "#fb7185";
  }

  if (score < 80) {
    return "#fbbf24";
  }

  return "#22d3ee";
}

function ReadinessOrb({ score }: ReadinessOrbProps) {
  const orbRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const [pulse, setPulse] = useState(false);

  const color = useMemo(() => getScoreColor(score), [score]);
  const energy = Math.max(0.35, score / 100);

  useFrame((state, delta) => {
    if (!orbRef.current || !ringRef.current) {
      return;
    }

    orbRef.current.rotation.y += delta * (0.25 + energy * 0.45);
    orbRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.55) * 0.12;

    ringRef.current.rotation.x += delta * 0.3;
    ringRef.current.rotation.z -= delta * 0.2;

    const pulseScale = pulse
      ? 1 + Math.sin(state.clock.elapsedTime * 8) * 0.08
      : 1;

    orbRef.current.scale.lerp(
      new THREE.Vector3(pulseScale, pulseScale, pulseScale),
      0.12,
    );
  });

  function triggerPulse() {
    setPulse(true);
    window.setTimeout(() => setPulse(false), 900);
  }

  return (
    <group>
      <mesh
        ref={orbRef}
        onClick={triggerPulse}
        onPointerEnter={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={() => {
          document.body.style.cursor = "default";
        }}
        castShadow
      >
        <icosahedronGeometry args={[1.35, 4]} />

        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25 + energy * 0.8}
          metalness={0.55}
          roughness={0.18}
          wireframe={score < 50}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[1.15, 0, 0]}>
        <torusGeometry args={[1.75, 0.035, 16, 100]} />

        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh rotation={[-0.75, 0.2, 0.4]}>
        <torusGeometry args={[1.95, 0.018, 12, 80]} />

        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>

      <pointLight
        position={[0, 0, 2]}
        color={color}
        intensity={6 + energy * 5}
        distance={8}
      />
    </group>
  );
}

function Scene({ score }: ReadinessSceneProps) {
  return (
    <>
      <color attach="background" args={["#020617"]} />

      <ambientLight intensity={0.45} />
      <directionalLight
        position={[4, 5, 4]}
        intensity={2.2}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[-4, -2, 3]} intensity={3} color="#2563eb" />

      <ReadinessOrb score={score} />

      <Sparkles
        count={45}
        scale={7}
        size={2}
        speed={0.25}
        color={getScoreColor(score)}
      />

      <ContactShadows
        position={[0, -2, 0]}
        opacity={0.4}
        scale={7}
        blur={2.5}
        far={4}
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={7}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={(Math.PI * 2) / 3}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_ROTATE,
        }}
      />
    </>
  );
}

export default function ReadinessScene({ score }: ReadinessSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{
        position: [0, 0, 5],
        fov: 45,
      }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
      }}
      shadows
      style={{
        position: "absolute",
        inset: 0,
        touchAction: "none",
      }}
    >
      <Scene score={score} />
    </Canvas>
  );
}