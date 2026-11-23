"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { rt } from "@/lib/space/store";
import { damp } from "./materials";

const MIN_FOV = 40;
const HFOV = THREE.MathUtils.degToRad(38);

/**
 * Flies the camera along a Catmull-Rom spline through every keyframe.
 * Scroll position → rig.u (keyframe index) → point on the spline, then smoothed.
 */
export function CameraRig({ parallax = true, reducedMotion = false }: { parallax?: boolean; reducedMotion?: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const st = useMemo(
    () => ({ version: -1, pos: new THREE.Vector3(), tgt: new THREE.Vector3(), sx: 0, sy: 0, px: 0, py: 0, ready: false }),
    [],
  );
  const curves = useRef<{ pos: THREE.CatmullRomCurve3; tgt: THREE.CatmullRomCurve3 } | null>(null);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const kf = rt.keyframes;
    if (st.version !== rt.version && kf.length > 1) {
      curves.current = {
        pos: new THREE.CatmullRomCurve3(kf.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal"),
        tgt: new THREE.CatmullRomCurve3(kf.map((k) => new THREE.Vector3(...k.target)), false, "centripetal"),
      };
      st.version = rt.version;
    }
    const c = curves.current;
    if (!c) return;
    const u = THREE.MathUtils.clamp(rt.rig.u / (kf.length - 1), 0, 1);
    c.pos.getPoint(u, tmp.p);
    c.tgt.getPoint(u, tmp.t);
    tmp.p.y += rt.intro.dy;
    tmp.p.z += rt.intro.dz;

    if (!reducedMotion) {
      const e = state.clock.elapsedTime;
      tmp.p.x += Math.sin(e * 0.19) * 0.07;
      tmp.p.y += Math.sin(e * 0.23 + 1.3) * 0.06;
    }
    if (parallax) {
      st.px = damp(st.px, rt.pointer.x, 2.2, dt);
      st.py = damp(st.py, rt.pointer.y, 2.2, dt);
      tmp.p.x += st.px * 0.32;
      tmp.p.y += st.py * 0.2;
    }

    if (!st.ready) {
      st.pos.copy(tmp.p);
      st.tgt.copy(tmp.t);
      st.sx = rt.rig.sx;
      st.sy = rt.rig.sy;
      st.ready = true;
    } else {
      const k = 1 - Math.exp(-5.5 * dt);
      st.pos.lerp(tmp.p, k);
      st.tgt.lerp(tmp.t, k);
      st.sx += (rt.rig.sx - st.sx) * k;
      st.sy += (rt.rig.sy - st.sy) * k;
    }

    camera.position.copy(st.pos);
    camera.lookAt(st.tgt);
    const { width: w, height: h } = size;
    const vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(HFOV / 2) / (w / h)));
    camera.fov = Math.min(78, Math.max(MIN_FOV, vfov));
    // Shift the subject sideways/up so it sits beside the text, not under it.
    camera.setViewOffset(w, h, -st.sx * w, st.sy * h, w, h);
    camera.updateProjectionMatrix();
    if (process.env.NODE_ENV !== "production") document.body.dataset.cam = JSON.stringify({ pos: st.pos.toArray().map((v) => +v.toFixed(2)), tgt: st.tgt.toArray().map((v) => +v.toFixed(2)), u: +rt.rig.u.toFixed(3) });
    rt.camera.x = st.pos.x;
    rt.camera.y = st.pos.y;
    rt.camera.z = st.pos.z;
  });
  return null;
}

