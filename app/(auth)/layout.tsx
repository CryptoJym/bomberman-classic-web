import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Sign in or create an account to play Bomberman Online',
};

/**
 * Auth Layout
 *
 * Wraps all authentication pages (sign-in, sign-up, etc.)
 * These pages are public and don't require authentication.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background gradient */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(230, 57, 70, 0.1) 0%, transparent 50%)',
        }}
      />
      {children}
    </div>
  );
}
