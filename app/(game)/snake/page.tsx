import type { Metadata } from 'next';
import { SnakeGame } from '@/components/game/SnakeGame';

export const metadata: Metadata = {
  title: 'Snake',
  description: 'Classic Snake built inside the Bomberman Online game area.',
};

export default function SnakePage() {
  return <SnakeGame />;
}
