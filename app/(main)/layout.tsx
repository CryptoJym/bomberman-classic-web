import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-retro-dark">
      {/* Navigation */}
      <nav className="border-b border-game-wall/50 bg-retro-navy/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/lobby" className="text-pixel text-sm text-bomber-yellow hover:text-accent-gold transition-colors">
            BOMBERMAN
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink href="/lobby">Lobby</NavLink>
            <NavLink href="/leaderboard">Leaderboard</NavLink>
            <NavLink href="/profile">Profile</NavLink>
          </div>

          {/* User Button */}
          <div className="flex items-center gap-4">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'w-10 h-10 border-2 border-bomber-blue',
                },
              }}
            />
          </div>
        </div>
      </nav>

      {/* Background */}
      <div className="fixed inset-0 -z-10 grid-bg opacity-10" />

      {/* Content */}
      {children}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-retro text-lg text-gray-400 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
