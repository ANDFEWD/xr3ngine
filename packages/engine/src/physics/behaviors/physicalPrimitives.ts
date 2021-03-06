import { Vec3, Box, Cylinder, ConvexPolyhedron, Quaternion, Sphere, Body } from 'cannon-es';
import { Vector3 } from 'three'
import { Entity } from '../../ecs/classes/Entity';
import { getComponent, getMutableComponent } from '../../ecs/functions/EntityFunctions';
import { TransformComponent } from '../../transform/components/TransformComponent';
import { ColliderComponent } from '../components/ColliderComponent';
import { RigidBody } from '../components/RigidBody';
import { MeshTagComponent } from '../../common/components/Object3DTagComponents';
import { threeToCannon } from '@xr3ngine/engine/src/templates/world/three-to-cannon';
import { CollisionGroups } from "../enums/CollisionGroups";

export function createTrimesh (mesh, position, mass) {
    mesh = mesh.clone();

		let shape = threeToCannon(mesh, {type: threeToCannon.Type.MESH});
		// Add phys sphere
    shape.collisionFilterGroup = CollisionGroups.TrimeshColliders;
		let body = new Body({ mass });
    body.addShape(shape, position);
	//	body.material = PhysicsManager.instance.trimMeshMaterial;
		return body;
}

export function createBox (entity: Entity) {
  const collider = getComponent<ColliderComponent>(entity, ColliderComponent);
  const rigidBody = getComponent<RigidBody>(entity, RigidBody);

  let mass = rigidBody ? collider.mass : 0;

  const shape = new Box(new Vec3(collider.scale[0] / 2, collider.scale[1] / 2, collider.scale[2] / 2));

  const body = new Body({
    mass: mass
  });

  const q = new Quaternion();
  q.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
  body.addShape(shape);

  //  body.quaternion.setFromAxisAngle(new Vec3(1,0,0),-Math.PI/2);
  //  body.angularVelocity.set(0,1,1);
  //body.angularDamping = 0.5;

  return body;
}

export function createGroundGeometry (entity: Entity) {
  const rigidBody = getComponent<ColliderComponent>(entity, ColliderComponent);

  const shape = new Box(new Vec3(rigidBody.scale[0] / 2, rigidBody.scale[1] / 2, rigidBody.scale[2] / 2));

  const body = new Body({
    mass: rigidBody.mass
  });
  const q = new Quaternion();
  q.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
  body.addShape(shape);

  //  body.quaternion.setFromAxisAngle(new Vec3(1,0,0),-Math.PI/2);
  //  body.angularVelocity.set(0,1,1);
  body.angularDamping = 0.5;

  return body;
}

export function createCylinder (entity: Entity) {
  const rigidBody = getComponent<ColliderComponent>(entity, ColliderComponent);
  const transform = getComponent<TransformComponent>(entity, TransformComponent);

  const cylinderShape = new Cylinder(rigidBody.scale[0], rigidBody.scale[1], rigidBody.scale[2], 20);
  const body = new Body({
    mass: rigidBody.mass,
    position: new Vec3(transform.position[0], transform.position[1], transform.position[2])
  });
  // body.type = Body.KINEMATIC;
  // body.collisionFilterGroup = 1; // turn off collisions
  const q = new Quaternion();
  q.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
  body.addShape(cylinderShape, new Vec3(), q);
  // body.angularVelocity.set(0,0,1);
  return body;
}

export function createSphere (entity: Entity) {
  const collider = getComponent<ColliderComponent>(entity, ColliderComponent);
  const rigidBody = getComponent<RigidBody>(entity, RigidBody);

  let mass = rigidBody ? collider.mass : 0;

  const shape = new Sphere(collider.scale[0] / 2);

  const body = new Body({
    mass: mass,
    });

  body.addShape(shape);
  return body;
}

export function createConvexGeometry (entity: Entity, mesh: any) {
  let rigidBody, object, transform, attributePosition;
  if (mesh) {
    object = mesh;
    attributePosition = object.geometry.attributes.position;
  } else {
    rigidBody = getComponent(entity, ColliderComponent);
    transform = getComponent(entity, TransformComponent);
    object = transform.getObject3D();
    attributePosition = object.geometry.attributes.position;
  }

  const convexBody = new Body({
    mass: 50
  });
  const verts = [];
  const faces = [];
  const normals = [];

  // Get vertice
  for (let j = 0; j < attributePosition.array.length; j += 3) {
    verts.push(new Vec3(attributePosition.array[j], attributePosition.array[j + 1], attributePosition.array[j + 2]));
  }
  console.log(verts);
  // Get faces
  for (let j = 0; j < object.geometry.index.array.length; j += 3) {
    faces.push([object.geometry.index.array[j], object.geometry.index.array[j + 1], object.geometry.index.array[j + 2]]);
  }
  /*
    for(var j=0; j<attributeNormal.array.length; j+=3){
        normals.push([
          attributeNormal.array[j],
          attributeNormal.array[j+1],
          attributeNormal.array[j+2]
        ]);
    }
*/
  console.log(faces);
  console.log(normals);
  // Get offset
  //  let offset = new Vec3(200,200,200);
  // Construct polyhedron
  const bunnyPart = new ConvexPolyhedron({ vertices: verts, faces });
  console.log(bunnyPart);

  const q = new Quaternion();
  q.setFromAxisAngle(new Vec3(1, 1, 0), -Math.PI / 2);
  //  body.addShape(cylinderShape, new Vec3(), q);
  // Add to compound
  convexBody.addShape(bunnyPart, new Vec3(), q); //, offset);
  return convexBody;
}
