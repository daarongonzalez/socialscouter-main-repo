"use client"

import { useEffect, useRef } from "react"

interface SentimentCircleProps {
  positive: number
  neutral: number
  negative: number
  size?: number
  strokeWidth?: number
}

export function SentimentCircle({ positive, neutral, negative, size = 120, strokeWidth = 12 }: SentimentCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    // Center of the circle
    const centerX = size / 2
    const centerY = size / 2
    const radius = (size - strokeWidth) / 2

    // Draw background circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.lineWidth = strokeWidth
    ctx.strokeStyle = "#f2f2f2"
    ctx.stroke()

    // Calculate angles for each segment
    const total = positive + neutral + negative
    if (total === 0) return

    const positiveAngle = (positive / total) * (2 * Math.PI)
    const neutralAngle = (neutral / total) * (2 * Math.PI)
    const negativeAngle = (negative / total) * (2 * Math.PI)

    // Draw negative segment (red)
    let startAngle = -Math.PI / 2 // Start from top
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + negativeAngle)
    ctx.lineWidth = strokeWidth
    ctx.strokeStyle = "#FF5757" // Red for negative
    ctx.stroke()

    // Draw neutral segment (yellow)
    startAngle += negativeAngle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + neutralAngle)
    ctx.lineWidth = strokeWidth
    ctx.strokeStyle = "#FFB260" // Yellow for neutral
    ctx.stroke()

    // Draw positive segment (green)
    startAngle += neutralAngle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + positiveAngle)
    ctx.lineWidth = strokeWidth
    ctx.strokeStyle = "#4CAF50" // Green for positive
    ctx.stroke()
  }, [positive, neutral, negative, size, strokeWidth])

  const getDominantSentiment = () => {
    if (positive > neutral && positive > negative) return "Positive"
    if (neutral > positive && neutral > negative) return "Neutral"
    return "Negative"
  }

  return (
    <div className="relative flex items-center justify-center">
      <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-medium">
          {getDominantSentiment()}
        </span>
      </div>
    </div>
  )
}