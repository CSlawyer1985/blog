export function laptopSegments(posture, segments) {
  if (posture !== 'folded' || segments?.length !== 2) return null;
  const sorted = [...segments].sort((a,b) => a.top-b.top);
  const [a,b] = sorted;
  if (![a,b].every(r => [r.left,r.top,r.width,r.height].every(Number.isFinite) && r.width > 0 && r.height > 0)) return null;
  return Math.abs(a.left-b.left)<2 && Math.abs(a.width-b.width)<2 && b.top>=a.top+a.height ? sorted : null;
}
