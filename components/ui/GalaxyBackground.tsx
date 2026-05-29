"use client";

import { useEffect, useRef } from "react";

export function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    interface Star {
      x: number; y: number; z: number;
      r: number; opacity: number;
      twinkle: number; offset: number;
    }
    interface Nebula {
      x: number; y: number;
      rx: number; ry: number;
      color: [number, number, number];
      alpha: number;
      speed: number;
      angle: number;
      drift: number;
    }

    const stars: Star[] = [];
    const nebulae: Nebula[] = [];

    function resize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
    }

    function init() {
      resize();
      stars.length = 0;
      nebulae.length = 0;

      // Stars — multiple layers for parallax depth
      for (let i = 0; i < 400; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random(), // depth 0=far, 1=near
          r: Math.random() * 1.5 + 0.2,
          opacity: Math.random() * 0.7 + 0.3,
          twinkle: Math.random() * 0.02 + 0.003,
          offset: Math.random() * Math.PI * 2,
        });
      }

      // Nebulae — floating color clouds
      const nebulaColors: [number, number, number][] = [
        [0, 80, 180],    // deep blue
        [60, 0, 140],    // purple
        [0, 140, 200],   // cyan
        [120, 0, 80],    // magenta
        [0, 60, 120],    // dark blue
      ];
      for (let i = 0; i < 5; i++) {
        nebulae.push({
          x: Math.random() * w,
          y: Math.random() * h,
          rx: 200 + Math.random() * 300,
          ry: 150 + Math.random() * 200,
          color: nebulaColors[i % nebulaColors.length],
          alpha: 0.03 + Math.random() * 0.04,
          speed: 0.1 + Math.random() * 0.2,
          angle: Math.random() * Math.PI * 2,
          drift: 0.0003 + Math.random() * 0.0005,
        });
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() / 1000;

      // Draw nebulae
      for (const n of nebulae) {
        n.angle += n.drift;
        const nx = n.x + Math.cos(n.angle) * 40;
        const ny = n.y + Math.sin(n.angle * 0.7) * 30;

        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.rx);
        const [r, g, b] = n.color;
        grad.addColorStop(0, `rgba(${r},${g},${b},${n.alpha})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${n.alpha * 0.4})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.ellipse(nx, ny, n.rx, n.ry, n.angle * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Draw stars
      for (const s of stars) {
        const speed = (0.15 + s.z * 0.35);
        s.y += speed;
        s.x += (s.z - 0.5) * 0.08; // subtle horizontal drift

        // Wrap
        if (s.y > h + 2) { s.y = -2; s.x = Math.random() * w; }
        if (s.x > w + 2) s.x = -2;
        if (s.x < -2) s.x = w + 2;

        const twinkle = Math.sin(t * s.twinkle * 60 + s.offset) * 0.3 + 0.7;
        const alpha = s.opacity * twinkle;
        const radius = s.r * (0.6 + s.z * 0.6);

        // Glow for brighter/closer stars
        if (s.z > 0.6 && radius > 0.8) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, radius * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(150,200,255,${alpha * 0.06})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        // Color variation based on depth
        if (s.z > 0.8) {
          ctx.fillStyle = `rgba(180,220,255,${alpha})`; // blue-white nearby
        } else if (s.z > 0.5) {
          ctx.fillStyle = `rgba(200,230,255,${alpha})`; // white mid
        } else {
          ctx.fillStyle = `rgba(160,180,220,${alpha * 0.7})`; // dim far
        }
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", () => { resize(); });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
