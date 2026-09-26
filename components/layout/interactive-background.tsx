"use client";

import { useEffect, useRef } from "react";

/**
 * İmlece tepki veren hafif nokta ızgarası.
 * - Yalnızca imleç hareket ettiğinde kare çizer (boşta CPU kullanmaz).
 * - prefers-reduced-motion etkinse statik ızgara çizilir.
 */
export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SPACING = 30;
    const RADIUS = 150;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let idleFrames = 0;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const offsetX = (width % SPACING) / 2;
      const offsetY = (height % SPACING) / 2;
      for (let x = offsetX; x <= width; x += SPACING) {
        for (let y = offsetY; y <= height; y += SPACING) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (pointer.active && dist < RADIUS) {
            const t = 1 - dist / RADIUS;
            const push = t * t * 6;
            const nx = x + (dx / (dist || 1)) * push;
            const ny = y + (dy / (dist || 1)) * push;
            ctx.fillStyle = `rgba(6, 182, 212, ${0.18 + t * 0.62})`;
            ctx.beginPath();
            ctx.arc(nx, ny, 1 + t * 1.1, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = "rgba(148, 163, 184, 0.13)";
            ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
          }
        }
      }
    };

    const tick = () => {
      pointer.x += (pointer.tx - pointer.x) * 0.18;
      pointer.y += (pointer.ty - pointer.y) * 0.18;
      draw();
      const settled = Math.abs(pointer.tx - pointer.x) < 0.5 && Math.abs(pointer.ty - pointer.y) < 0.5;
      idleFrames = settled ? idleFrames + 1 : 0;
      frame = idleFrames > 4 ? 0 : requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!pointer.active) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      }
      pointer.active = true;
      pointer.tx = e.clientX;
      pointer.ty = e.clientY;
      if (!frame && !reduced) frame = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      pointer.active = false;
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduced) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_0%,#020617_75%)] opacity-70" />
    </div>
  );
}
