import './index.css';
import { OrthographicCamera } from 'three';
import { Engine } from './Engine';

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
  const engine = new Engine(orthoCamera);
  const renderElt = document.getElementById('root')!;
  engine.attach(renderElt);
  // No orbit controls for strict top-down 2D feel
  return engine;
}
