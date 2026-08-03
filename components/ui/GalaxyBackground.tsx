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

      // Stars — reduced count for performance, depth preserved
      for (let i = 0; i < 150; i++) {
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

      // Pre-render nebulae into an offscreen canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext("2d");
      if (offCtx) {
        /* Solo familia azul, muy tenue — coherente con el tema Ink */
        const nebulaColors: [number, number, number][] = [
          [37, 99, 235],   // azul marca
          [30, 64, 120],   // azul profundo
          [59, 130, 246],  // azul claro
          [25, 40, 80],    // azul noche
          [45, 110, 180],  // azul medio
        ];

        for (let i = 0; i < 5; i++) {
          const nx = Math.random() * w;
          const ny = Math.random() * h;
          const rx = 300 + Math.random() * 400;
          const ry = 250 + Math.random() * 300;
          const alpha = 0.02 + Math.random() * 0.025;
          const angle = Math.random() * Math.PI * 2;
          
          const grad = offCtx.createRadialGradient(nx, ny, 0, nx, ny, rx);
          const [r, g, b] = nebulaColors[i % nebulaColors.length];
          grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
          grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

          offCtx.beginPath();
          offCtx.ellipse(nx, ny, rx, ry, angle, 0, Math.PI * 2);
          offCtx.fillStyle = grad;
          offCtx.fill();
        }
      }
      // Store the pre-rendered nebulae as an Image for lightning-fast 60fps rendering
      const nebulaeImg = new Image();
      nebulaeImg.src = offscreen.toDataURL();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      nebulae.push({ img: nebulaeImg } as any);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() / 1000;

      // Draw pre-rendered nebulae (static but extremely fast)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      if (nebulae[0] && (nebulae[0] as any).img) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
        ctx.drawImage((nebulae[0] as any).img, 0, 0);
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
    window.addEventListener("resize", resize);

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
