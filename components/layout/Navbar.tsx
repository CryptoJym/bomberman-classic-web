'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { clsx } from 'clsx';

const navLinks = [
  { href: '/lobby', label: 'Lobby' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-game-wall/50 bg-retro-navy/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/lobby"
          className="text-pixel text-sm text-bomber-yellow hover:text-accent-gold transition-colors"
        >
          BOMBERMAN
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'text-retro text-lg transition-colors',
                pathname === href
                  ? 'text-bomber-yellow'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {label}
            </Link>
          ))}
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

      {/* Mobile Nav */}
      <div className="md:hidden border-t border-game-wall/30">
        <div className="flex justify-around py-2">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'text-retro text-sm px-3 py-2 transition-colors',
                pathname === href
                  ? 'text-bomber-yellow'
                  : 'text-gray-400'
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
