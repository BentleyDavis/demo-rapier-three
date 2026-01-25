import { BallBuilder } from './objects/BallObject';
import { AttractorBuilder } from './objects/AttractorObject';
import { BumperBuilder } from './objects/BumperObject';

// Add new object builders here as you create them:
export const objectBuilders = [
  BallBuilder,
  AttractorBuilder,
  BumperBuilder,
];

// Add new object types here as you create them:
// export { createNewObject, stepNewObject } from './objects/NewObject';

// Dynamically build union types for all object types and data types
type BuilderType = typeof objectBuilders[number];
export type AnyObject = ReturnType<BuilderType['create']>;
export type AnyObjectData = Parameters<BuilderType['create']>[0];

// Step and create function maps built dynamically from objectBuilders
export const stepFuncs = Object.fromEntries(
  objectBuilders.map(builder => [builder.type, builder.step])
);
export const createFuncs = Object.fromEntries(
  objectBuilders.map(builder => [builder.type, builder.create])
);
