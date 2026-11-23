"use client";

import dynamic from "next/dynamic";

export const HeroSun = dynamic(() => import("./HeroSun"), { ssr: false, loading: () => null });
export const OrbitScene = dynamic(() => import("./OrbitScene"), { ssr: false, loading: () => null });
