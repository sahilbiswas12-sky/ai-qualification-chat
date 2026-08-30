import ReadinessExperience from "@/app/components/three/ReadinessExperience";

export const metadata = {
  title: "3D Project Readiness Orb",
  description:
    "An interactive 3D visualization that represents project qualification readiness.",
};

export default function ThreeDExperiencePage() {
  return (
    <main className="min-h-screen bg-[#030712] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">
            Interactive 3D Experience
          </p>

          <h1 className="text-4xl font-bold sm:text-5xl">
            Project Readiness Orb
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Select a qualification score and watch the orb change its color,
            energy and animation. Drag to rotate, pinch or scroll to zoom, and
            tap the orb to trigger an energy pulse.
          </p>
        </div>

        <ReadinessExperience />
      </div>
    </main>
  );
}