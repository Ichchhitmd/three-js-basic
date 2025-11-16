"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Physics, useSphere, usePlane, useBox } from "@react-three/cannon";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useState, useRef } from "react";
import * as THREE from "three";

// ============================================
// TYPES & INTERFACES
// ============================================

interface KeyState {
  w: boolean;
  s: boolean;
  a: boolean;
  d: boolean;
  space: boolean;
}

interface BoxProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

interface PlatformProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

// ============================================
// CONFIGURATION
// ============================================

const PLAYER_CONFIG = {
  mass: 1,
  radius: 0.3,
  spawnPosition: [0, 1, 0] as [number, number, number],
  moveSpeed: 5,
  jumpForce: 5,
  jumpThreshold: 0.1,
};

const PHYSICS_CONFIG = {
  gravity: [0, -9.8, 0] as [number, number, number],
};

const GROUND_CONFIG = {
  size: [50, 50] as [number, number],
  color: "#567d46",
  position: [0, -0.5, 0] as [number, number, number],
};

const ENVIRONMENT_DATA = {
  platforms: [
    { position: [5, 0, -5], size: [4, 0.5, 4], color: "#8a5a44" },
    { position: [-5, 1, -8], size: [4, 0.5, 4], color: "#8a5a44" },
    { position: [0, 2, -15], size: [8, 0.5, 4], color: "#8a5a44" },
    { position: [10, 3, -10], size: [4, 0.5, 4], color: "#8a5a44" },
    { position: [-10, 4, -5], size: [4, 0.5, 4], color: "#8a5a44" },
  ] as PlatformProps[],

  boxes: [
    { position: [2, 2, -3], size: [1, 1, 1], color: "#4d4dff" },
    { position: [-2, 2, -3], size: [1, 1, 1], color: "#ff4d4d" },
    { position: [0, 2, -6], size: [1, 1, 1], color: "#4dff4d" },
    { position: [4, 5, -4], size: [0.8, 0.8, 0.8], color: "#ffff4d" },
    { position: [-4, 5, -4], size: [0.8, 0.8, 0.8], color: "#ff4dff" },
  ] as BoxProps[],

  walls: [
    { position: [15, 5, 0], size: [1, 10, 30], color: "#555555" },
    { position: [-15, 5, 0], size: [1, 10, 30], color: "#555555" },
    { position: [0, 5, -25], size: [30, 10, 1], color: "#555555" },
    { position: [0, 5, 15], size: [30, 10, 1], color: "#555555" },
  ] as PlatformProps[],
};

// ============================================
// CUSTOM HOOKS
// ============================================

function useKeyboardControls() {
  const [keys, setKeys] = useState<KeyState>({
    w: false,
    s: false,
    a: false,
    d: false,
    space: false,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === " ") {
        setKeys((prev) => ({ ...prev, space: true }));
      } else if (key in keys) {
        setKeys((prev) => ({ ...prev, [key]: true }));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === " ") {
        setKeys((prev) => ({ ...prev, space: false }));
      } else if (key in keys) {
        setKeys((prev) => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  return keys;
}

// ============================================
// COMPONENTS
// ============================================

function Player() {
  const [ref, api] = useSphere(() => ({
    mass: PLAYER_CONFIG.mass,
    position: PLAYER_CONFIG.spawnPosition,
    type: "Dynamic",
    args: [PLAYER_CONFIG.radius],
  }));

  const position = useRef<[number, number, number]>([0, 0, 0]);
  const velocity = useRef<[number, number, number]>([0, 0, 0]);
  const keys = useKeyboardControls();
  const { camera } = useThree();

  // Subscribe to physics updates
  useEffect(() => {
    const unsubscribePos = api.position.subscribe((p) => {
      position.current = p as [number, number, number];
    });
    const unsubscribeVel = api.velocity.subscribe((v) => {
      velocity.current = v as [number, number, number];
    });

    return () => {
      unsubscribePos();
      unsubscribeVel();
    };
  }, [api]);

  // Movement logic
  useFrame(() => {
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3();
    const sideVector = new THREE.Vector3();

    // Calculate movement direction
    frontVector.set(0, 0, Number(keys.s) - Number(keys.w));
    sideVector.set(Number(keys.a) - Number(keys.d), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(PLAYER_CONFIG.moveSpeed)
      .applyEuler(camera.rotation);

    // Apply horizontal movement, preserve vertical velocity for gravity
    api.velocity.set(direction.x, velocity.current[1], direction.z);

    // Handle jumping
    const isGrounded =
      Math.abs(velocity.current[1]) < PLAYER_CONFIG.jumpThreshold;
    if (keys.space && isGrounded) {
      api.velocity.set(
        velocity.current[0],
        PLAYER_CONFIG.jumpForce,
        velocity.current[2]
      );
    }

    // Update camera to follow player
    camera.position.copy(new THREE.Vector3(...position.current));
  });

  return <mesh ref={ref} />;
}

function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: GROUND_CONFIG.position,
    type: "Static",
  }));

  return (
    <mesh ref={ref}>
      <planeGeometry args={GROUND_CONFIG.size} />
      <meshStandardMaterial color={GROUND_CONFIG.color} />
    </mesh>
  );
}

function DynamicBox({ position, size, color }: BoxProps) {
  const [ref] = useBox(() => ({
    mass: 0.6,
    position,
    args: size,
  }));

  return (
    <mesh ref={ref}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function StaticPlatform({ position, size, color }: PlatformProps) {
  const [ref] = useBox(() => ({
    type: "Static",
    position,
    args: size,
  }));

  return (
    <mesh ref={ref}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Environment() {
  return (
    <>
      {/* Static Platforms */}
      {ENVIRONMENT_DATA.platforms.map((platform, i) => (
        <StaticPlatform
          key={`platform-${i}`}
          position={platform.position}
          size={platform.size}
          color={platform.color}
        />
      ))}

      {/* Dynamic Boxes */}
      {ENVIRONMENT_DATA.boxes.map((box, i) => (
        <DynamicBox
          key={`box-${i}`}
          position={box.position}
          size={box.size}
          color={box.color}
        />
      ))}

      {/* Boundary Walls */}
      {ENVIRONMENT_DATA.walls.map((wall, i) => (
        <StaticPlatform
          key={`wall-${i}`}
          position={wall.position}
          size={wall.size}
          color={wall.color}
        />
      ))}
    </>
  );
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight
        castShadow
        position={[10, 10, 5]}
        intensity={1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />

      <color attach="background" args={["#87ceeb"]} />
    </>
  );
}

function GameScene() {
  return (
    <Canvas camera={{ position: [0, 1, 0], fov: 70 }}>
      <Lighting />

      <Physics gravity={PHYSICS_CONFIG.gravity}>
        <Ground />
        <Environment />
        <Player />
      </Physics>

      <PointerLockControls />
    </Canvas>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FPSGame() {
  return (
    <main className="h-screen bg-black">
      <GameScene />
    </main>
  );
}
