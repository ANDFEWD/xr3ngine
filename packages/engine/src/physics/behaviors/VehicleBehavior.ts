import { Quaternion, Box, Cylinder, Sphere, Vec3, RaycastVehicle, Body } from 'cannon-es';
import { Entity } from '../../ecs/classes/Entity';
import { Behavior } from '../../common/interfaces/Behavior';
import { getMutableComponent, getComponent } from '../../ecs/functions/EntityFunctions';
import { Object3DComponent } from '../../common/components/Object3DComponent';
import { TransformComponent } from '../../transform/components/TransformComponent';
import { AssetLoader } from "@xr3ngine/engine/src/assets/components/AssetLoader";
import { PhysicsManager } from '../components/PhysicsManager';
import { VehicleBody } from '../../physics/components/VehicleBody';
import { Engine } from "@xr3ngine/engine/src/ecs/classes/Engine";
import { createTrimesh } from './physicalPrimitives';
import { CollisionGroups } from "../enums/CollisionGroups";
import { cannonFromThreeVector } from "@xr3ngine/engine/src/common/functions/cannonFromThreeVector";

const quaternion = new Quaternion();

export const VehicleBehavior: Behavior = (entity: Entity, args): void => {
  if (args.phase == 'onAdded') {
    const vehicleComponent = getMutableComponent(entity, VehicleBody);
    const vehicle = createVehicleBody(entity);
    vehicleComponent.vehiclePhysics = vehicle


  } else if (args.phase == 'onUpdate') {

    const transform = getMutableComponent<TransformComponent>(entity, TransformComponent);
    const vehicleComponent = getMutableComponent(entity, VehicleBody) as VehicleBody;

    if( vehicleComponent.vehiclePhysics != null && vehicleComponent.vehicleMesh != null){

      const vehicle = vehicleComponent.vehiclePhysics;
      const chassisBody = vehicle.chassisBody;
      const wheels = vehicleComponent.arrayWheelsMesh;


      transform.position.set(
        chassisBody.position.x,
        chassisBody.position.y,
        chassisBody.position.z
      )

      transform.rotation.set(
        chassisBody.quaternion.x,
        chassisBody.quaternion.y,
        chassisBody.quaternion.z,
        chassisBody.quaternion.w
      )
      for (let i = 0; i < wheels.length; i++) {

        vehicle.updateWheelTransform(i);

        wheels[i].position.set(
          vehicle.wheelInfos[i].worldTransform.position.x,
          vehicle.wheelInfos[i].worldTransform.position.y,
          vehicle.wheelInfos[i].worldTransform.position.z
        )

        wheels[i].quaternion.set(
          vehicle.wheelInfos[i].worldTransform.quaternion.x,
          vehicle.wheelInfos[i].worldTransform.quaternion.y,
          vehicle.wheelInfos[i].worldTransform.quaternion.z,
          vehicle.wheelInfos[i].worldTransform.quaternion.w
        )

      }



  } else {
    console.warn("User data for vehicle not found")
  }


  } else if (args.phase == 'onRemoved') {
    // TO DO
    /*
    const object = getComponent<Object3DComponent>(entity, Object3DComponent, true)?.value;
    if (!object) {
      return
    }
    const body = object.userData.vehicle;
    delete object.userData.vehicle;
    PhysicsManager.instance.physicsWorld.removeBody(body);
    */
  }
};




export function createVehicleBody (entity: Entity ) {
  const transform = getComponent<TransformComponent>(entity, TransformComponent);
  const vehicleComponent = getMutableComponent<VehicleBody>(entity, VehicleBody);
  const wheelsPositions = vehicleComponent.arrayWheelsPosition;
  const wheelRadius = vehicleComponent.wheelRadius;
  const vehicleCollider = vehicleComponent.vehicleCollider;
  const vehicleSphereColliders = vehicleComponent.vehicleSphereColliders;
  const mass = vehicleComponent.mass

  let chassisBody, chassisShape;

  if (vehicleCollider) {
    let offset = new Vec3(0, -0.8, 0)
    chassisBody = createTrimesh(vehicleCollider, offset, mass)
    chassisBody.shapes.forEach((shape) => {
      shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders;
    })
  } else {
    //chassisShape = new Box(new Vec3(1, 0.2, 2.0));
    chassisBody = new Body({ mass });
  //  chassisBody.addShape(chassisShape);
  }


  for (let i = 0; i < vehicleSphereColliders.length; i++) {
    const shape = new Sphere(vehicleSphereColliders[i].scale.x);
    shape.collisionFilterMask = ~CollisionGroups.Characters;
    chassisBody.addShape(shape, cannonFromThreeVector(vehicleSphereColliders[i].position));
  }


  //  let
  chassisBody.position.x = transform.position.x
  chassisBody.position.y = transform.position.y
  chassisBody.position.z = transform.position.z
  //  chassisBody.angularVelocity.set(0, 0, 0.5);
  const options = {
    radius: wheelRadius,
    directionLocal: new Vec3(0, -1, 0),
    suspensionStiffness: 30,
    suspensionRestLength: 0.3,
    frictionSlip: 5,
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,
    maxSuspensionForce: 100000,
    rollInfluence: 0.01,
    axleLocal: new Vec3(-1, 0, 0),
    chassisConnectionPointLocal: new Vec3(),
    maxSuspensionTravel: 0.3,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true
  };

  // Create the vehicle
  const vehicle = new RaycastVehicle({
    chassisBody: chassisBody,
    indexUpAxis: 1,
    indexRightAxis: 0,
    indexForwardAxis: 2
  });

//
  options.chassisConnectionPointLocal.set(wheelsPositions[0].x, wheelsPositions[0].z, wheelsPositions[0].y);
  vehicle.addWheel(options);

  options.chassisConnectionPointLocal.set(wheelsPositions[1].x, wheelsPositions[1].z, wheelsPositions[1].y);
  vehicle.addWheel(options);

  options.chassisConnectionPointLocal.set(wheelsPositions[2].x, wheelsPositions[2].z, wheelsPositions[2].y);
  vehicle.addWheel(options);

  options.chassisConnectionPointLocal.set(wheelsPositions[3].x, wheelsPositions[3].z, wheelsPositions[3].y);
  vehicle.addWheel(options);

  const wheelBodies = [];
  for (let i = 0; i < vehicle.wheelInfos.length; i++) {
    const cylinderShape = new Cylinder(wheelRadius, wheelRadius, 0.1, 20);
    const wheelBody = new Body({
      mass: 0
    });
    wheelBody.type = Body.KINEMATIC;
    wheelBody.collisionFilterGroup = 0; // turn off collisions
    wheelBody.addShape(cylinderShape);
    wheelBodies.push(wheelBody);

  }

  vehicle.addToWorld(PhysicsManager.instance.physicsWorld);


  for (let i = 0; i < wheelBodies.length; i++) {
    PhysicsManager.instance.physicsWorld.addBody(wheelBodies[i]);
  }
  return vehicle;
}
