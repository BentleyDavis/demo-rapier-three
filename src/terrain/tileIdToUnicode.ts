// Utility to map tile id (type_rotation) to Unicode box drawing
export function tileIdToUnicode(id: string | null): string {
  if (id === null) return ' ';

  if (id.startsWith('corner_')) {
    const rot = parseInt(id.split('_')[1], 10);
    switch (rot) {
      case 0: return '╗';
      case 90: return '╝';
      case 180: return '╚';
      case 270: return '╔';
      default: return '?';
    }
  }

  if (id.startsWith('corridor_')) {
    const rot = parseInt(id.split('_')[1], 10);
    if (rot === 0 || rot === 180) return '║';
    if (rot === 90 || rot === 270) return '═';
    return '?';
  }

  if (id.startsWith('oneWall_')) {
    const rot = parseInt(id.split('_')[1], 10);
    switch (rot) {
      case 0: return '╦';
      case 90: return '╣';
      case 180: return '╩';
      case 270: return '╠';
      default: return '?';
    }
  }

  if (id.startsWith('land_')) {
    return '╬';
  }
  return '?';
}
