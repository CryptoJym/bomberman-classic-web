import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-retro-dark p-4">
      {/* Background effects */}
      <div className="grid-bg absolute inset-0 opacity-20" />
      <div className="scanlines absolute inset-0" />

      {/* Floating decorative bombs */}
      <div className="absolute top-10 right-10 text-4xl animate-bounce opacity-50">💣</div>
      <div
        className="absolute bottom-20 left-10 text-3xl animate-bounce opacity-50"
        style={{ animationDelay: '0.5s' }}
      >
        💥
      </div>
      <div
        className="absolute top-1/3 left-1/4 text-2xl animate-bounce opacity-30"
        style={{ animationDelay: '0.3s' }}
      >
        ⭐
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and title */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="font-pixel text-2xl text-bomber-yellow drop-shadow-glow-gold mb-2">
              BOMBERMAN
            </h1>
            <p className="font-pixel text-xs text-bomber-cyan">ONLINE</p>
          </Link>
        </div>

        {/* Sign-up card wrapper */}
        <div className="card-retro p-6">
          <h2 className="font-pixel text-sm text-white text-center mb-2">CREATE PLAYER</h2>
          <p className="font-retro text-gray-400 text-center mb-6 text-sm">
            Join the arena and start bombing!
          </p>

          <SignUp
            appearance={{
              elements: {
                rootBox: 'mx-auto w-full',
                card: 'bg-transparent shadow-none p-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                header: 'hidden',
                formButtonPrimary:
                  'w-full bg-gradient-to-b from-bomber-green to-green-700 hover:from-green-600 hover:to-green-800 font-pixel text-xs uppercase tracking-wider border-2 border-white/20 shadow-retro-button transition-all duration-100 hover:translate-y-0.5 active:translate-y-1',
                formFieldInput:
                  'w-full bg-retro-darker border-2 border-game-wall text-white font-retro text-lg shadow-pixel-inset placeholder:text-gray-500 focus:border-bomber-blue focus:outline-none focus:ring-0',
                formFieldLabel: 'text-gray-300 font-pixel text-xs uppercase mb-2',
                formFieldLabelRow: 'mb-1',
                footerAction: 'pt-4',
                footerActionLink:
                  'text-bomber-blue hover:text-bomber-cyan font-retro text-lg transition-colors',
                footerActionText: 'text-gray-400 font-retro text-lg',
                identityPreviewText: 'text-white font-retro',
                identityPreviewEditButton: 'text-bomber-blue font-retro hover:text-bomber-cyan',
                socialButtonsBlockButton:
                  'bg-retro-darker border-2 border-game-wall text-white font-retro hover:border-bomber-blue transition-colors',
                socialButtonsBlockButtonText: 'font-retro text-sm',
                dividerLine: 'bg-game-wall',
                dividerText: 'text-gray-500 font-pixel text-xs',
                formFieldSuccessText: 'text-bomber-green font-retro',
                formFieldErrorText: 'text-bomber-red font-retro',
                alert: 'bg-retro-darker border-2 border-bomber-red text-white font-retro',
                alertText: 'text-white',
                formResendCodeLink: 'text-bomber-blue hover:text-bomber-cyan font-retro',
                otpCodeFieldInput:
                  'bg-retro-darker border-2 border-game-wall text-white font-retro focus:border-bomber-blue',
              },
              layout: {
                socialButtonsPlacement: 'bottom',
                socialButtonsVariant: 'blockButton',
              },
            }}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
          />
        </div>

        {/* Bottom decorative line */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-game-wall" />
          <span className="font-pixel text-xs text-gray-500">INSERT COIN</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-game-wall" />
        </div>
      </div>
    </main>
  );
}
