"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Physics, useSphere, usePlane, useBox } from "@react-three/cannon";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useState, useRef } from "react";
import * as THREE from "three";

// Player Component with WASD Controls
function Player() {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: [0, 1, 0],
    type: "Dynamic",
    args: [0.3],
  }));

  // Track position for debugging
  const position = useRef([0, 0, 0]);
  useEffect(() => {
    api.position.subscribe((p) => (position.current = p));
  }, [api.position]);

  const [keys, setKeys] = useState({
    w: false,
    s: false,
    a: false,
    d: false,
    space: false,
  });

  const velocity = useRef([0, 0, 0]);
  useEffect(() => {
    api.velocity.subscribe((v) => (velocity.current = v));
  }, [api.velocity]);

  const { camera } = useThree();
  const direction = new THREE.Vector3();
  const frontVector = new THREE.Vector3();
  const sideVector = new THREE.Vector3();

  // Key press handlers
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === " ") {
        setKeys((prev) => ({ ...prev, space: true }));
      } else {
        setKeys((prev) => ({ ...prev, [key]: true }));
      }
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key === " ") {
        setKeys((prev) => ({ ...prev, space: false }));
      } else {
        setKeys((prev) => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Update movement on each frame
  useFrame(() => {
    // Set movement direction based on camera's orientation
    frontVector.set(0, 0, Number(keys.s) - Number(keys.w));
    sideVector.set(Number(keys.a) - Number(keys.d), 0, 0);
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(5) // Movement speed
      .applyEuler(camera.rotation);

    // Apply movement velocity - preserve y velocity for gravity
    api.velocity.set(direction.x, velocity.current[1], direction.z);

    // Jump when space is pressed and player is near ground
    if (keys.space && Math.abs(velocity.current[1]) < 0.1) {
      api.velocity.set(velocity.current[0], 5, velocity.current[2]);
    }

    // Update camera position to follow player
    camera.position.copy(new THREE.Vector3(...position.current));
  });

  return <mesh ref={ref} />;
}

// Ground Plane with Physics
function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.5, 0],
    type: "Static",
  }));

  return (
    <mesh ref={ref}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#567d46" />
    </mesh>
  );
}

// Box objects for the environment
function Box({ position, size, color }) {
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

// Obstacle Platform (static)
function Platform({ position, size, color }) {
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



// Random Environment Generator
function Environment() {
  // Create platforms
  const platforms = [
    { position: [5, 0, -5], size: [4, 0.5, 4], color: "#8a5a44" },
    { position: [-5, 1, -8], size: [4, 0.5, 4], color: "#8a5a44" },
    { position: [0, 2, -15], size: [8, 0.5, 4], color: "#8a5a44" },
    { position: [10, 3, -10], size: [4, 0.5, 4], color: "#8a5a44" },
    { position: [-10, 4, -5], size: [4, 0.5, 4], color: "#8a5a44" },
  ];

  // Create dynamic boxes
  const boxes = [
    { position: [2, 2, -3], size: [1, 1, 1], color: "#4d4dff" },
    { position: [-2, 2, -3], size: [1, 1, 1], color: "#ff4d4d" },
    { position: [0, 2, -6], size: [1, 1, 1], color: "#4dff4d" },
    { position: [4, 5, -4], size: [0.8, 0.8, 0.8], color: "#ffff4d" },
    { position: [-4, 5, -4], size: [0.8, 0.8, 0.8], color: "#ff4dff" },
  ];

  // Create walls
  const walls = [
    { position: [15, 5, 0], size: [1, 10, 30], color: "#555555" },
    { position: [-15, 5, 0], size: [1, 10, 30], color: "#555555" },
    { position: [0, 5, -25], size: [30, 10, 1], color: "#555555" },
    { position: [0, 5, 15], size: [30, 10, 1], color: "#555555" },
  ];

  return (
    <>
      {/* Platforms */}
      {platforms.map((platform, i) => (
        <Platform
          key={`platform-${i}`}
          position={platform.position}
          size={platform.size}
          color={platform.color}
        />
      ))}

      {/* Dynamic Boxes */}
      {boxes.map((box, i) => (
        <Box
          key={`box-${i}`}
          position={box.position}
          size={box.size}
          color={box.color}
        />
      ))}

      {/* Walls */}
      {walls.map((wall, i) => (
        <Platform
          key={`wall-${i}`}
          position={wall.position}
          size={wall.size}
          color={wall.color}
        />
      ))}

    </>
  );
}

// Scene Component
export default function Scene() {
  return (
    <main className="h-screen bg-black">
      <Canvas camera={{ position: [0, 1, 0], fov: 70 }}>
        {/* Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <directionalLight position={[-10, 10, -5]} intensity={0.5} />
        <color attach="background" args={["#87ceeb"]} />

        {/* Enable Physics */}
        <Physics gravity={[0, -9.8, 0]}>
          <Ground />
          <Environment />
          <Player />
        </Physics>

        {/* FPS Controls */}
        <PointerLockControls />
      </Canvas>
    </main>
  );
}