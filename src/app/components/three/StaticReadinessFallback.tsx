type StaticReadinessFallbackProps = {
  score?: number;
  message?: string;
};

function getFallbackColor(score: number) {
  if (score < 50) {
    return {
      orb: "from-rose-300 via-rose-500 to-red-950",
      glow: "bg-rose-500",
    };
  }

  if (score < 80) {
    return {
      orb: "from-yellow-200 via-amber-400 to-orange-950",
      glow: "bg-amber-400",
    };
  }

  return {
    orb: "from-cyan-200 via-cyan-400 to-blue-950",
    glow: "bg-cyan-400",
  };
}

export default function StaticReadinessFallback({
  score = 68,
  message = "Static 3D preview",
}: StaticReadinessFallbackProps) {
  const colors = getFallbackColor(score);

  return (
    <div
      role="img"
      aria-label={`Static project readiness visualization showing a score of ${score} out of 100`}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#020617]"
    >
      <div
        className={`absolute h-64 w-64 rounded-full ${colors.glow} opacity-20 blur-3xl`}
      />

      <div
        className={`relative flex h-48 w-48 items-center justify-center rounded-full border border-white/30 bg-linear-to-br ${colors.orb} shadow-2xl`}
      >
        <div className="absolute inset-4 rounded-full border border-white/20" />

        <div className="relative text-center">
          <span className="block text-5xl font-black text-white">{score}</span>
          <span className="text-sm font-medium text-white/70">out of 100</span>
        </div>
      </div>

      <p className="relative mt-8 max-w-sm px-6 text-center text-sm text-slate-400">
        {message}
      </p>
    </div>
  );
}