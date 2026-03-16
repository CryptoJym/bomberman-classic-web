export const MOBILE_BREAKPOINT = 900;

export function isMobileViewport(width) {
  return Number(width) <= MOBILE_BREAKPOINT;
}

export function computeViewportLayout(width, height) {
  const mobile = isMobileViewport(width);

  if (mobile) {
    const compactPhone = Number(width) <= 430;
    return {
      mode: 'mobile',
      sidebarMode: 'sheet',
      showTouchControls: true,
      topInset: compactPhone ? 108 : 98,
      bottomInset: compactPhone ? 196 : 184,
      leftInset: 16,
      rightInset: 16,
      maxBoardHeight: Math.max(320, Number(height) - 300),
    };
  }

  return {
    mode: 'desktop',
    sidebarMode: 'dock',
    showTouchControls: false,
    topInset: 64,
    bottomInset: 32,
    leftInset: 280,
    rightInset: 48,
    maxBoardHeight: Math.max(420, Number(height) - 120),
  };
}
