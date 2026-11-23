"use client";

import dynamic from "next/dynamic";

export const OrbitScene = dynamic(() => import("./OrbitScene"), { ssr: false, loading: () => null });
