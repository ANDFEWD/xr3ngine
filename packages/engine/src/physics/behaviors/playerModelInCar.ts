import { Behavior } from '../../common/interfaces/Behavior';
import { TransformComponent } from '../../transform/components/TransformComponent';
import { CharacterComponent } from "@xr3ngine/engine/src/templates/character/components/CharacterComponent";
import { ColliderComponent } from '../components/ColliderComponent';
import { VehicleBody } from '../components/VehicleBody';
import { PlayerInCar } from '../components/PlayerInCar';
import { Vector3 } from 'three';
import { Entity } from '../../ecs/classes/Entity';
import { PhysicsManager } from '../components/PhysicsManager';
import { getMutableComponent, hasComponent, getComponent, addComponent } from '../../ecs/functions/EntityFunctions';
import { Object3DComponent } from '../../common/components/Object3DComponent';
import { cannonFromThreeVector } from '../../common/functions/cannonFromThreeVector';
import { addState, hasState } from '@xr3ngine/engine/src/state/behaviors/StateBehaviors';
import { CharacterStateTypes } from "@xr3ngine/engine/src/templates/character/CharacterStateTypes";
import { State } from "@xr3ngine/engine/src/state/components/State";
import { FollowCameraComponent } from "@xr3ngine/engine/src/camera/components/FollowCameraComponent";
import { LocalInputReceiver } from "@xr3ngine/engine/src/input/components/LocalInputReceiver";
import { setPosition } from "@xr3ngine/engine/src/templates/character/behaviors/setPosition";


export const playerModelInCar: Behavior = (entity: Entity, args: { type: string, phase?: string }, delta): void => {

  if (args.phase === 'onAdded') {
    addState(entity, {state: CharacterStateTypes.ENTER_VEHICLE})
    return
  }

  if (args.phase === 'onRemoved') {
    addState(entity, {state: CharacterStateTypes.EXIT_VEHICLE})
    return
  }



  const actor = getMutableComponent<CharacterComponent>(entity, CharacterComponent as any);
  const stateComponent = getComponent<State>(entity, State);
  const transform = getMutableComponent<TransformComponent>(entity, TransformComponent);
  const playerInCarComponent = getComponent<PlayerInCar>(entity, PlayerInCar);
  const entityCar = playerInCarComponent.entityCar
  const transformCar = getComponent<TransformComponent>(entityCar, TransformComponent);
  const vehicleComponent = getMutableComponent<VehicleBody>(entityCar, VehicleBody);

  if (actor.timer > 2.1) {
    addState(entity, {state: CharacterStateTypes.DRIVING_IDLE})
  }

  if (!stateComponent.data.has(CharacterStateTypes.ENTER_VEHICLE)) {

    if (!hasComponent(entityCar, LocalInputReceiver)) {
      addComponent(entityCar, LocalInputReceiver)
      addComponent(entityCar, FollowCameraComponent, { distance: 3, mode: "thirdPerson" })
      vehicleComponent.currentDriver = entity
    }

    let entrance = new Vector3(
      vehicleComponent.seatsArray[0][0],
      vehicleComponent.seatsArray[0][1]+0.2,
      vehicleComponent.seatsArray[0][2]+0.51
    ).applyQuaternion(transformCar.rotation)

    transform.position.copy( entrance.add(transformCar.position) )
    transform.rotation.copy( transformCar.rotation )

  } else {
    let entrance = new Vector3(
      vehicleComponent.entrancesArray[0][0],
      vehicleComponent.entrancesArray[0][1],
      vehicleComponent.entrancesArray[0][2]
    ).applyQuaternion(transformCar.rotation)
    entrance = entrance.add(transformCar.position)
    setPosition(entity, entrance)
  }


}
