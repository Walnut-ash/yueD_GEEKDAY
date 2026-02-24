"use client"

import React, { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"

interface D20DiceProps {
  result: number | null
  rolling: boolean
  onRollComplete?: () => void
  className?: string
}

export default function D20Dice({
  result,
  rolling,
  onRollComplete,
  className
}: D20DiceProps) {
  const [currentNumber, setCurrentNumber] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)
  const requestRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const previousRollingRef = useRef(false)

  // Animation loop for rolling effect
  const animate = (time: number) => {
    if (!rolling) return

    if (startTimeRef.current === 0) startTimeRef.current = time
    const elapsed = time - startTimeRef.current

    // Update number every 100ms
    if (Math.floor(elapsed / 100) % 2 === 0) {
      setCurrentNumber(Math.floor(Math.random() * 20) + 1)
    }

    // Rotate continuously
    setRotation((prev) => (prev + 5) % 360)
    
    // Scale pulse
    const pulse = Math.sin(elapsed / 100) * 0.1 + 1
    setScale(pulse)

    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (rolling) {
      startTimeRef.current = 0
      requestRef.current = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(requestRef.current)
      
      // When rolling stops
      if (previousRollingRef.current && !rolling) {
        // Set final result
        if (result !== null) {
          setCurrentNumber(result)
        }
        
        // Reset transform to stable state
        setRotation(0)
        setScale(1)
        
        // Trigger completion callback after a short delay for visual effect
        if (onRollComplete) {
          setTimeout(onRollComplete, 500)
        }
      }
    }
    
    previousRollingRef.current = rolling
    
    return () => cancelAnimationFrame(requestRef.current)
  }, [rolling, result, onRollComplete])

  return (
    <div className={cn("flex items-center justify-center w-full h-full", className)}>
      <div 
        className="relative w-48 h-48 transition-all duration-300 ease-out"
        style={{
          transform: `rotate(${rotation}deg) scale(${scale})`
        }}
      >
        {/* D20 SVG Shape */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full drop-shadow-2xl"
          style={{ filter: "drop-shadow(0 10px 15px rgba(79, 70, 229, 0.4))" }}
        >
          {/* Outer Hexagon (Silhouette of Icosahedron) */}
          <path
            d="M50 5 L93.3 30 L93.3 80 L50 105 L6.7 80 L6.7 30 Z"
            fill="#4f46e5" // Indigo 600
            stroke="#312e81" // Indigo 900
            strokeWidth="2"
            className="transition-colors duration-300"
          />
          
          {/* Internal Edges to simulate 3D faces */}
          <path
            d="M50 5 L50 55 M50 55 L6.7 80 M50 55 L93.3 80 M6.7 30 L50 55 M93.3 30 L50 55"
            stroke="#4338ca" // Indigo 700
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
          
          {/* Highlight/Shine */}
          <path
            d="M50 5 L93.3 30 L50 55 Z"
            fill="rgba(255,255,255,0.1)"
          />
        </svg>

        {/* Number Display */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            transform: `rotate(${-rotation}deg)` // Counter-rotate text to keep it upright-ish or let it spin? 
            // Actually keeping it spinning with the dice looks more realistic for "rolling"
            // But for readability, maybe let it spin.
            // Let's keep it spinning with the dice container.
          }}
        >
          <span 
            className="text-5xl font-bold text-amber-400 font-mono tracking-tighter"
            style={{ 
              textShadow: "2px 2px 0px rgba(0,0,0,0.5)"
            }}
          >
            {/* Show random number 1-20 when rolling */}
            {currentNumber}
          </span>
        </div>
      </div>
    </div>
  )
}
