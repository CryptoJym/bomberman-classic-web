interface SpectatePageProps {
  params: {
    roomId: string;
  };
}

export default function SpectatePage({ params }: SpectatePageProps) {
  const { roomId } = params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-retro-darker p-4">
      <div className="card-retro p-8 text-center">
        <h1 className="text-pixel text-xl text-bomber-yellow mb-4">SPECTATOR MODE</h1>
        <p className="text-retro text-gray-400 mb-4">Room: {roomId}</p>
        <p className="text-retro text-gray-500">Spectator mode coming soon...</p>
      </div>
    </main>
  );
}
