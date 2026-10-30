"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Color, InstancedMesh, Object3D } from "three";

export type Item = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
  rx?: number;
  ry?: number;
  rz?: number;
};

// Many copies of one geometry in a single draw call. The child is the
// geometry + material; each Item gives a position, scale, rotation and colour.
export function Instances({
  items,
  children,
  shadows = false,
}: {
  items: Item[];
  children: ReactNode;
  shadows?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    o.rotation.order = "YZX";
    const c = new Color();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
      o.scale.set(it.sx, it.sy, it.sz);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  if (items.length === 0) return null;
  return (
    <instancedMesh key={items.length} ref={ref} args={[undefined, undefined, items.length]} castShadow={shadows}>
      {children}
    </instancedMesh>
  );
}
