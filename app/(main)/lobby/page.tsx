import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function LobbyPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="card-retro max-w-4xl w-full p-8">
        <h1 className="text-pixel text-2xl text-bomber-yellow text-center mb-8">GAME LOBBY</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Play */}
          <div className="card-retro p-6 hover:scale-105 transition-transform cursor-pointer">
            <h2 className="text-pixel text-sm text-accent-electric mb-2">QUICK PLAY</h2>
            <p className="text-retro text-gray-400">Jump into a random match instantly</p>
          </div>

          {/* Create Room */}
          <div className="card-retro p-6 hover:scale-105 transition-transform cursor-pointer">
            <h2 className="text-pixel text-sm text-bomber-green mb-2">CREATE ROOM</h2>
            <p className="text-retro text-gray-400">Start a private game with friends</p>
          </div>

          {/* Join Room */}
          <div className="card-retro p-6 hover:scale-105 transition-transform cursor-pointer">
            <h2 className="text-pixel text-sm text-bomber-blue mb-2">JOIN ROOM</h2>
            <p className="text-retro text-gray-400">Enter a room code to join</p>
          </div>

          {/* Browse Rooms */}
          <div className="card-retro p-6 hover:scale-105 transition-transform cursor-pointer">
            <h2 className="text-pixel text-sm text-bomber-orange mb-2">BROWSE ROOMS</h2>
            <p className="text-retro text-gray-400">Find public games to join</p>
          </div>
        </div>

        {/* Online Players */}
        <div className="mt-8 text-center">
          <p className="text-retro text-gray-500">
            <span className="text-accent-electric">●</span> Players Online: <span className="text-white">0</span>
          </p>
        </div>
      </div>
    </main>
  );
}
