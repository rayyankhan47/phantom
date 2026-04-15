import { Vec3 } from 'vec3';

export type Vec3Like = { x: number; y: number; z: number };

export interface InventoryItem {
  name: string;
  count: number;
  slot: number;
}

export interface NearbyBlock {
  name: string;
  position: Vec3Like;
  distance: number;
}

export interface NearbyEntity {
  name: string;
  type: string;
  position: Vec3Like;
  distance: number;
  health?: number;
}

/** Convert a Vec3Like to a vec3 instance */
export function toVec3(v: Vec3Like): Vec3 {
  return new Vec3(v.x, v.y, v.z);
}

/** Convert a vec3 instance to a plain Vec3Like */
export function fromVec3(v: Vec3): Vec3Like {
  return { x: v.x, y: v.y, z: v.z };
}
