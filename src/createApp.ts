import './index.css';
import { Engine, EngineConfig } from './Engine';


export function createApp() {

  const objects = [
    {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 30, y: 0, z: 0 },
      color: 0xffff00,
      attraction: 0,
      fixed: false
    },
    {
      position: { x: 2, y: 0, z: 2 },
      velocity: { x: 0, y: 0, z: 20 },
      color: 0xffff00,
      attraction: 0,
      fixed: false
    },
    {
      position: { x: 8, y: 0, z: 8 },
      velocity: undefined,
      color: 0x00aaff,
      attraction: 1,
      fixed: true
    },
        {
      position: { x: -2, y: 0, z: 0 },
      velocity: undefined,
      color: 0x00aaff,
      attraction: 1,
      fixed: true
    },
  ];

  // Add 10 balls, each 1 unit apart along the x axis
  for (let i = 0; i < 10; i++) {
    // Vary color using HSL to RGB for a rainbow effect
    const hue = Math.round((i / 10) * 360);
    // Simple HSL to RGB conversion
    function hslToRgb(h: number, s: number, l: number) {
      s /= 100;
      l /= 100;
      const k = (n: number) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1));
      return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
    }
    const [r, g, b] = hslToRgb(hue, 80, 50);
    const color = (r << 16) | (g << 8) | b;
    objects.push({
      position: { x: i, y: 0, z: 5 },
      velocity: { x: 0, y: 0, z: 0 },
      color,
      attraction: 0,
      fixed: false
    });
  }

  const config: EngineConfig = {
    world: {
      linearDamping: 2.0,
      angularDamping: 2.0,
      ccdEnabled: true,
      friction: 0.2,
      restitution: 0.6,
      camera: {
        position: { x: 30, y: 30, z: 30 },
        lookAt: { x: 0, y: 0, z: 0 }
      }
    },
    objects
  };
  const engine = new Engine(config);
  const renderElt = document.getElementById('root')!;
  engine.attach(renderElt);
  // No orbit controls for strict top-down 2D feel
  return engine;
}
