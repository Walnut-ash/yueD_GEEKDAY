"use client"

import { useState, useRef, useCallback, useEffect, useMemo, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

/* ─── Helper to create number textures without external fonts ─── */
function useNumberTextures(numbers: number[], color: string) {
  return useMemo(() => {
    return numbers.map((num) => {
      const canvas = document.createElement("canvas")
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, 128, 128)
        ctx.fillStyle = color
        // Use system fonts which are guaranteed to exist
        ctx.font = "bold 90px Arial, sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        // Add a slight shadow/outline for better visibility
        ctx.strokeStyle = "rgba(0,0,0,0.5)"
        ctx.lineWidth = 4
        ctx.strokeText(String(num), 64, 64)
        ctx.fillText(String(num), 64, 64)
      }
      const texture = new THREE.CanvasTexture(canvas)
      texture.anisotropy = 16
      return texture
    })
  }, [numbers, color])
}

/* ─── Compute face centers & orientations for number placement ─── */
function useFaceData(radius: number) {
  return useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(radius, 0)
    const pos = geo.attributes.position
    const faces: { center: THREE.Vector3; normal: THREE.Vector3; quaternion: THREE.Quaternion }[] = []

    for (let i = 0; i < pos.count; i += 3) {
      const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
      const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1))
      const c = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2))

      const center = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3)
      const normal = new THREE.Vector3()
        .crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a))
        .normalize()

      // Ensure normal points outward
      if (normal.dot(center) < 0) normal.negate()

      // Build quaternion: rotate from (0, 0, 1) to the face normal
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        normal
      )

      faces.push({ center, normal, quaternion })
    }

    geo.dispose()
    return faces
  }, [radius])
}

/* ─── Single face‑colored D20 mesh with numbers 1‑20 ─── */
function D20Mesh({ rolling, radius = 1.4 }: { rolling: boolean; radius?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const faces = useFaceData(radius)

  // Color palette matching reference: deep purple / crimson-red / dark plum
  const faceColors = [
    "#6B2D8B", "#A92234", "#3B1550", "#8C1C3C", "#5A2070",
    "#C4384A", "#2E1040", "#9A2860", "#7B2D8B", "#B03040",
    "#4A1860", "#A02848", "#6A2080", "#C03838", "#351248",
    "#8A2050", "#5B2878", "#B83440", "#3E1555", "#A42840",
  ]

  // Classic D20 number layout (opposite faces sum to 21)
  const faceNumbers = useMemo(() => [20, 1, 12, 9, 8, 13, 16, 5, 4, 17, 14, 7, 2, 19, 10, 11, 18, 3, 6, 15], [])
  
  // Pre-generate number textures using system fonts
  const numberTextures = useNumberTextures(faceNumbers, "#f0e8d0")

  useEffect(() => {
    if (!meshRef.current) return
    const geo = new THREE.IcosahedronGeometry(radius, 0)

    const colors = new Float32Array(geo.attributes.position.count * 3)
    for (let i = 0; i < 20; i++) {
      const color = new THREE.Color(faceColors[i % faceColors.length])
      for (let j = 0; j < 3; j++) {
        colors[(i * 3 + j) * 3] = color.r
        colors[(i * 3 + j) * 3 + 1] = color.g
        colors[(i * 3 + j) * 3 + 2] = color.b
      }
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    meshRef.current.geometry = geo
  }, [radius])

  // Animation
  const rollStart = useRef(0)
  const isRolling = useRef(false)
  const idleTime = useRef(0)

  // Random target rotation for each roll so a different face ends up in front
  const targetRotation = useRef(new THREE.Euler(0, 0, 0))
  const spinBase = useRef(new THREE.Euler(0, 0, 0))

  useEffect(() => {
    if (rolling) {
      rollStart.current = 0
      isRolling.current = true

      // Pick a random face (0-19) to land on by choosing one of the 20 face normals
      // and computing the rotation needed to point that face toward the camera (0,0,1)
      const faceIndex = Math.floor(Math.random() * 20)
      const geo = new THREE.IcosahedronGeometry(radius, 0)
      const pos = geo.attributes.position
      const fi = faceIndex * 3
      const a = new THREE.Vector3(pos.getX(fi), pos.getY(fi), pos.getZ(fi))
      const b = new THREE.Vector3(pos.getX(fi + 1), pos.getY(fi + 1), pos.getZ(fi + 1))
      const c = new THREE.Vector3(pos.getX(fi + 2), pos.getY(fi + 2), pos.getZ(fi + 2))
      const normal = new THREE.Vector3()
        .crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a))
        .normalize()
      const center = new THREE.Vector3().addVectors(a, b).add(c).divideScalar(3)
      if (normal.dot(center) < 0) normal.negate()
      geo.dispose()

      // Quaternion to rotate this face's normal toward camera (0, 0, 1)
      const q = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1))
      // Add extra full spins (multiple of 2*PI) so it looks dramatic
      const extraSpins = 4 + Math.floor(Math.random() * 3) // 4-6 full spins
      const finalEuler = new THREE.Euler().setFromQuaternion(q)
      targetRotation.current = new THREE.Euler(
        finalEuler.x + Math.PI * 2 * extraSpins * (Math.random() > 0.5 ? 1 : -1),
        finalEuler.y + Math.PI * 2 * extraSpins * (Math.random() > 0.5 ? 1 : -1),
        finalEuler.z + Math.PI * 2 * (1 + Math.floor(Math.random() * 2)) * (Math.random() > 0.5 ? 1 : -1),
      )

      // Save current rotation as spin base
      if (groupRef.current) {
        spinBase.current = groupRef.current.rotation.clone()
      }
    }
  }, [rolling, radius])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    if (isRolling.current) {
      rollStart.current += delta
      const t = rollStart.current
      const duration = 2.5

      if (t < duration) {
        // Eased progress: fast start, slow deceleration
        const linear = t / duration
        const eased = 1 - Math.pow(1 - linear, 3) // ease-out cubic

        // Interpolate from spin base toward target rotation
        groupRef.current.rotation.x = spinBase.current.x + (targetRotation.current.x - spinBase.current.x) * eased
        groupRef.current.rotation.y = spinBase.current.y + (targetRotation.current.y - spinBase.current.y) * eased
        groupRef.current.rotation.z = spinBase.current.z + (targetRotation.current.z - spinBase.current.z) * eased

        // Bounce scale effect that settles
        const bounce = 1 + Math.sin(t * 6) * 0.1 * (1 - linear)
        groupRef.current.scale.setScalar(bounce)
      } else {
        isRolling.current = false
        groupRef.current.scale.setScalar(1)
        // Snap to exact final rotation
        const q = new THREE.Quaternion().setFromEuler(targetRotation.current)
        const finalEuler = new THREE.Euler().setFromQuaternion(q)
        groupRef.current.rotation.set(finalEuler.x, finalEuler.y, finalEuler.z)
      }
    } else {
      idleTime.current += delta
      const t = idleTime.current
      groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.15
      groupRef.current.rotation.y += delta * 0.3
      groupRef.current.rotation.z = Math.cos(t * 0.3) * 0.1
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.05
    }
  })

  // Offset text slightly above face surface
  const textOffset = 0.06

  return (
    <group ref={groupRef}>
      {/* Main colored mesh */}
      <mesh ref={meshRef} castShadow>
        <icosahedronGeometry args={[radius, 0]} />
        <meshStandardMaterial vertexColors roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Edge wireframe */}
      <mesh>
        <icosahedronGeometry args={[radius + 0.005, 0]} />
        <meshBasicMaterial color="#1a0a20" wireframe wireframeLinewidth={1} />
      </mesh>

      {/* Numbers 1-20 on each face using CanvasTextures */}
      {faces.map((face, i) => {
        const num = faceNumbers[i] ?? i + 1
        // Small outward offset to avoid z-fighting
        const pos = face.center
          .clone()
          .add(face.normal.clone().multiplyScalar(textOffset))
        
        const size = radius * 0.5

        // Convert quaternion to euler so we can pass as rotation prop
        const euler = new THREE.Euler().setFromQuaternion(face.quaternion)

        return (
          <mesh
            key={i}
            position={[pos.x, pos.y, pos.z]}
            rotation={[euler.x, euler.y, euler.z]}
          >
            <planeGeometry args={[size, size]} />
            <meshBasicMaterial 
              map={numberTextures[i]} 
              transparent={true} 
              opacity={1}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

/* ─── Rolling overlay: full screen 3D dice throw ─── */
export function DiceRollOverlay({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<"rolling" | "done">("rolling")

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("done")
      onFinish()
    }, 2600)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/70 backdrop-blur-md" />

      {phase === "rolling" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="d20-spark"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 1.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 w-[280px] h-[280px] d20-roll-glow">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 4]} intensity={1.2} color="#ffeedd" />
          <directionalLight position={[-3, -2, 2]} intensity={0.4} color="#cc88ff" />
          <pointLight position={[0, 0, 3]} intensity={0.6} color="#ff6644" />
          <Suspense fallback={null}>
            <D20Mesh rolling={true} radius={1.6} />
          </Suspense>
        </Canvas>
      </div>

      {phase === "rolling" && (
        <p
          className="absolute bottom-[28%] text-lg font-semibold animate-pulse drop-shadow-lg z-20"
          style={{ color: "oklch(0.95 0 0)" }}
        >
          投掷中...
        </p>
      )}
    </div>
  )
}

/* ─── Small tab‑bar D20 dice with interaction ─── */
interface Dice3DProps {
  onTap: () => void
  onLongPress: () => void
  isRolling: boolean
}

export function Dice3D({ onTap, onLongPress, isRolling }: Dice3DProps) {
  const [pressing, setPressing] = useState(false)
  const [isLongPress, setIsLongPress] = useState(false)
  const [webglOk, setWebglOk] = useState(true)
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas")
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      setWebglOk(Boolean(gl))
    } catch {
      setWebglOk(false)
    }
  }, [])

  const handlePointerDown = useCallback(() => {
    startTimeRef.current = Date.now()
    setPressing(true)
    setIsLongPress(false)
    pressTimerRef.current = setTimeout(() => {
      setIsLongPress(true)
      onLongPress()
    }, 500)
  }, [onLongPress])

  const handlePointerUp = useCallback(() => {
    setPressing(false)
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    const elapsed = Date.now() - startTimeRef.current
    if (elapsed < 500 && !isLongPress && !isRolling) {
      onTap()
    }
  }, [isLongPress, isRolling, onTap])

  const handlePointerCancel = useCallback(() => {
    setPressing(false)
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }, [])

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`absolute rounded-full transition-all duration-300 ${
          pressing
            ? "w-16 h-16 blur-lg"
            : isRolling
              ? "w-14 h-14 blur-md animate-pulse"
              : "w-12 h-12 blur-sm"
        }`}
        style={{
          background: pressing
            ? "oklch(0.5 0.2 320 / 0.5)"
            : isRolling
              ? "oklch(0.5 0.2 320 / 0.4)"
              : "oklch(0.5 0.15 320 / 0.15)",
        }}
      />

      {pressing && !isRolling && (
        <svg className="absolute w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke="oklch(0.5 0.22 320)"
            strokeWidth="2.5"
            strokeDasharray={`${2 * Math.PI * 24}`}
            strokeDashoffset={`${2 * Math.PI * 24}`}
            strokeLinecap="round"
            style={{ animation: "progress-ring 500ms ease-out forwards" }}
          />
        </svg>
      )}

      <div
        className="relative z-10 cursor-pointer select-none touch-none"
        style={{ width: 48, height: 48 }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
      >
        {webglOk ? (
          <Canvas
            camera={{ position: [0, 0, 4.5], fov: 35 }}
            gl={{ antialias: true, alpha: true }}
            style={{
              background: "transparent",
              pointerEvents: "none",
              transform: pressing ? "scale(0.85)" : "scale(1)",
              transition: "transform 0.15s ease",
            }}
          >
            <ambientLight intensity={0.6} />
            <directionalLight position={[2, 3, 4]} intensity={1} color="#ffeedd" />
            <directionalLight position={[-2, -1, 2]} intensity={0.3} color="#cc88ff" />
            <Suspense fallback={null}>
              <D20Mesh rolling={false} />
            </Suspense>
          </Canvas>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xl">🎲</span>
          </div>
        )}
      </div>
    </div>
  )
}
