export const stagger = (i, base = 0.07) => ({
  animation: 'fadeSlideUp 0.45s ease both',
  animationDelay: `${i * base}s`,
});
