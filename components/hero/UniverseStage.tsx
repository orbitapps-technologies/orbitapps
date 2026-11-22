"use client";

import dynamic from "next/dynamic";
import { useDeviceProfile } from "@/lib/useDeviceProfile";
import { CssUniverse } from "./CssUniverse";

function StageLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center" role="status" aria-live="polite">
      <div className="relative grid place-items-center">
        <div className="size-28 rounded-full bg-[radial-gradient(circle_at_40%_38%,#FFF1CF,#FFB347_55%,#E0640F)] opacity-80 blur-[1px] [animation:sun-breathe_2.4s_ease-in-out_infinite]" />
        <div className="absolute size-64 rounded-full bg-[radial-gradient(circle,rgba(255,179,71,0.25),transparent_65%)]" />
      </div>
      <span className="sr-only">Loading the OrbitApps universe</span>
    </div>
  );
}

const UniverseCanvas = dynamic(() => import("@/components/three/UniverseCanvas"), {
  ssr: false,
  loading: () => <StageLoading />,
});

export function UniverseStage({ paused }: { paused: boolean }) {
  const profile = useDeviceProfile();
  if (!profile) return <StageLoading />;
  if (!profile.webgl) return <CssUniverse />;
  return <UniverseCanvas lowPower={profile.lowPower} paused={paused} />;
}
