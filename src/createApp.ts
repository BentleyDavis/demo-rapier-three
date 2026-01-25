import './index.css';
import { Engine, EngineConfig } from './Engine';
import { AnyObjectData } from './items/objects';


export function createApp() {

  const objects: AnyObjectData[] = [
    // {
    //   type: 'ball',
    //   position: { x: 0, y: 0, z: 0 },
    //   color: 0xffff00,
    //   fixed: false
    // },
    // {
    //   type: 'ball',
    //   position: { x: 2, y: 0, z: 2 },
    //   color: 0xffff00,
    //   fixed: false
    // },
    {
      type: 'attractor',
      position: { x: 20, y: 0, z: 0 },
      color: 0x00aaff,
      attraction: 1,
    },
    {
      type: 'attractor',
      position: { x: 0, y: 0, z: 0 },
      color: 0x00aaff,
      attraction: 1,
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
      type: 'ball',
      position: { x: i * 3, y: 0, z: 5 },
      color,
    });
  }

  const config: EngineConfig = {
    world: {
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
