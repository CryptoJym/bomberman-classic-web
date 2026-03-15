const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 8;
const DEFAULT_ROOM_CODE = 'CLASSIC';

export function normalizeRoomCode(rawValue) {
  const cleaned = String(rawValue || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH);

  return cleaned || DEFAULT_ROOM_CODE;
}

export function createRoomCode(randomFn = Math.random) {
  let code = '';
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const alphabetIndex = Math.floor(randomFn() * ROOM_ALPHABET.length) % ROOM_ALPHABET.length;
    code += ROOM_ALPHABET[alphabetIndex];
  }
  return code;
}

export function readRoomCodeFromLocation(locationLike) {
  const url = new URL(String(locationLike.href || locationLike));
  const roomParam = url.searchParams.get('room');
  return roomParam ? normalizeRoomCode(roomParam) : null;
}

export function buildShareUrl(href, roomCode) {
  const url = new URL(href);
  url.searchParams.set('room', normalizeRoomCode(roomCode));
  return url.toString();
}
