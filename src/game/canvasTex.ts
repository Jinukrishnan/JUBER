"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

// CSS font string for Malayalam text on a canvas. next/font exposes the real
// (hashed) family name through a CSS variable on <html>; fall back to common
// system Malayalam fonts if it is missing.
export function malayalamFont(weight: number, px: number): string {
  let fam = "";
  try {
    fam = getComputedStyle(document.documentElement).getPropertyValue("--font-malayalam").trim();
  } catch {
    // no DOM styles available
  }
  return `${weight} ${px}px ${fam ? `${fam}, ` : ""}"Noto Sans Malayalam", "Nirmala UI", Kartika, sans-serif`;
}

export type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function paint(c: HTMLCanvasElement, draw: Draw) {
  const g = c.getContext("2d");
  if (g) draw(g, c.width, c.height);
}

// A texture painted by `draw`. When `fontText` is given, the Malayalam web font
// is loaded first and the texture repainted once it is ready, so signs never
// stay stuck on a fallback or empty glyphs.
export function useCanvasTexture(w: number, h: number, draw: Draw, fontText?: string, repeat = false): CanvasTexture {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    paint(c, draw);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = RepeatWrapping; // tiles across a surface (building windows)
    return t;
  }, [w, h, draw, repeat]);

  useEffect(() => {
    if (!fontText) return;
    let live = true;
    document.fonts
      .load(malayalamFont(800, 40), fontText)
      .then(() => {
        if (!live) return;
        paint(tex.image as HTMLCanvasElement, draw);
        tex.needsUpdate = true;
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [tex, fontText, draw]);

  return tex;
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tileable speckle texture (grass, asphalt, paving) painted once.
export function useNoiseTexture(opts: {
  size: number;
  base: [number, number, number];
  spread: number;
  dots: number;
  seed: number;
  repeat: [number, number];
  lines?: { every: number; color: string };
}): CanvasTexture {
  const { size, base, spread, dots, seed, repeat, lines } = opts;
  const [rx, ry] = repeat;
  const lineEvery = lines?.every;
  const lineColor = lines?.color;
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    if (g) {
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
      g.fillRect(0, 0, size, size);
      const r = mulberry(seed);
      for (let i = 0; i < dots; i++) {
        const d = (r() - 0.5) * spread;
        g.fillStyle = `rgb(${base[0] + d},${base[1] + d * 1.1},${base[2] + d * 0.8})`;
        const s = 1 + r() * 2.5;
        g.fillRect(r() * size, r() * size, s, s);
      }
      if (lineEvery && lineColor) {
        g.strokeStyle = lineColor;
        g.lineWidth = 1.5;
        for (let p = 0; p <= size; p += lineEvery) {
          g.beginPath();
          g.moveTo(p, 0);
          g.lineTo(p, size);
          g.moveTo(0, p);
          g.lineTo(size, p);
          g.stroke();
        }
      }
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    return t;
  }, [size, base, spread, dots, seed, rx, ry, lineEvery, lineColor]);
}
