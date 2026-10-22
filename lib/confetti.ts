import confetti from 'canvas-confetti'

/**
 * Memicu efek Confetti Kemenangan versi Ringan & Ringkas
 */
export const triggerVictoryConfetti = () => {
  // Partikel dikurangi dari 200 menjadi 80 agar GPU tidak terbeban
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    zIndex: 9999,
    disableForReducedMotion: true, // Hormati preferensi hemat daya perangkat
  })
}