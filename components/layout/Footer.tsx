'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export interface FooterProps {
  /** Additional class names */
  className?: string;
}

/**
 * Site footer component
 */
export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const links = [
    { href: '/terms', label: 'Terms' },
    { href: '/privacy', label: 'Privacy' },
    { href: '/support', label: 'Support' },
  ];

  const socialLinks = [
    { href: 'https://twitter.com', label: 'Twitter', icon: '𝕏' },
    { href: 'https://discord.com', label: 'Discord', icon: '⌘' },
    { href: 'https://github.com', label: 'GitHub', icon: '⌥' },
  ];

  return (
    <footer
      className={cn(
        'w-full',
        'bg-retro-darker border-t-2 border-game-wall/30',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo and copyright */}
          <div className="flex flex-col gap-2">
            <span className="font-pixel text-xs text-bomber-yellow">
              BOMBERMAN ONLINE
            </span>
            <span className="font-retro text-xs text-gray-500">
              © {currentYear} All rights reserved
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'font-retro text-sm text-gray-400',
                  'hover:text-white transition-colors'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'w-8 h-8 flex items-center justify-center',
                  'bg-retro-navy border border-game-wall',
                  'text-gray-400 hover:text-white hover:border-bomber-blue',
                  'transition-all duration-150'
                )}
                aria-label={social.label}
              >
                <span className="font-pixel text-xs">{social.icon}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Retro pixel decoration */}
        <div className="mt-6 pt-4 border-t border-game-wall/20">
          <div className="flex justify-center gap-2">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2',
                  i % 3 === 0 ? 'bg-bomber-red/30' : '',
                  i % 3 === 1 ? 'bg-bomber-yellow/30' : '',
                  i % 3 === 2 ? 'bg-bomber-blue/30' : ''
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export interface MinimalFooterProps {
  /** Additional class names */
  className?: string;
}

/**
 * Minimal footer for in-game screens
 */
export function MinimalFooter({ className }: MinimalFooterProps) {
  return (
    <footer
      className={cn(
        'w-full py-2 px-4',
        'bg-retro-darker/50 border-t border-game-wall/20',
        'flex items-center justify-between',
        className
      )}
    >
      <span className="font-pixel text-[8px] text-gray-500">
        BOMBERMAN ONLINE v1.0
      </span>
      <span className="font-retro text-xs text-gray-500">
        Press ESC for menu
      </span>
    </footer>
  );
}
