import './index.css';
import { OrthographicCamera } from 'three';
import { Engine, EngineObjectConfig } from './Engine';

export function createApp() {
  const aspect = window.innerWidth / window.innerHeight;
  const d = 20;
  const orthoCamera = new OrthographicCamera(
    -d * aspect,
    d * aspect,
    d,
    -d,
    0.1,
    1000
  );
  orthoCamera.position.set(8, 50, 8);
  orthoCamera.lookAt(8, 0, 8);
  const objects: EngineObjectConfig[] = [
    {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 30, y: 0, z: 0 },
      color: 0xffff00
    },
    {
      position: { x: 8, y: 0, z: 8 },
      attraction: 1,
      color: 0x00aaff,
      fixed: true
    }
  ];
  const engine = new Engine(objects, orthoCamera);
  const renderElt = document.getElementById('root')!;
  engine.attach(renderElt);
  // No orbit controls for strict top-down 2D feel
  return engine;
}
