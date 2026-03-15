import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 grid-bg opacity-20" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanlines" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        {/* Logo/Title */}
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-pixel text-4xl text-bomber-yellow drop-shadow-pixel-lg md:text-6xl">
            BOMBERMAN
          </h1>
          <p className="text-pixel text-lg text-accent-electric md:text-2xl">ONLINE</p>
        </div>

        {/* Tagline */}
        <p className="text-retro max-w-md text-xl text-gray-300 md:text-2xl">
          Battle your friends in classic SNES-style multiplayer action!
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/sign-in"
            className="btn-retro-primary text-pixel px-8 py-4 text-sm transition-transform hover:scale-105"
          >
            PLAY NOW
          </Link>
          <Link
            href="/sign-up"
            className="btn-retro-secondary text-pixel px-8 py-4 text-sm transition-transform hover:scale-105"
          >
            CREATE ACCOUNT
          </Link>
        </div>

        {/* Features */}
        <div className="mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon="💣"
            title="Classic Gameplay"
            description="Strategic bomb placement and power-up collection"
          />
          <FeatureCard
            icon="🌐"
            title="Multiplayer"
            description="Battle up to 16 players online"
          />
          <FeatureCard
            icon="🏆"
            title="Leaderboards"
            description="Climb the ranks and prove your skills"
          />
          <FeatureCard
            icon="🎮"
            title="Tournaments"
            description="Compete in organized competitive play"
          />
        </div>

        {/* Footer */}
        <footer className="text-retro mt-16 text-sm text-gray-500">
          <p>© 2024 Bomberman Online. Made with 💛 and PixiJS.</p>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card-retro flex flex-col items-center gap-3 p-6 text-center transition-transform hover:scale-105">
      <span className="text-4xl">{icon}</span>
      <h3 className="text-pixel text-xs text-bomber-yellow">{title}</h3>
      <p className="text-retro text-sm text-gray-400">{description}</p>
    </div>
  );
}
