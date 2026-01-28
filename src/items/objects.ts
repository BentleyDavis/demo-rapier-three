import { BallBuilder } from './objects/BallObject';
import { AttractorBuilder } from './objects/AttractorObject';
import { BumperBuilder } from './objects/BumperObject';
import { LandBuilder } from './objects/LandObject';
import { CorridorBuilder } from './objects/CorridorObject';
import { OneWallBuilder } from './objects/OneWallObject';
import { CornerBuilder } from './objects/CornerObject';

// Add new object builders here as you create them:
export const objectBuilders = [
  BallBuilder,
  AttractorBuilder,
  BumperBuilder,
  LandBuilder,
  CorridorBuilder,
  OneWallBuilder,
  CornerBuilder,
];

// Add new object types here as you create them:
// export { createNewObject, stepNewObject } from './objects/NewObject';

// Dynamically build union types for all object types and data types
type BuilderType = typeof objectBuilders[number];
export type AnyObject = ReturnType<BuilderType['create']>;
export type AnyObjectData = Parameters<BuilderType['create']>[0];

// Only include step if it exists on the builder
export const stepFuncs = Object.fromEntries(
  objectBuilders
    .filter(builder => typeof (builder as any).step === 'function')
    .map(builder => [builder.type, (builder as any).step])
);
export const createFuncs = Object.fromEntries(
  objectBuilders.map(builder => [builder.type, builder.create])
);
