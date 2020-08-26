import { Behavior } from "../../../common/interfaces/Behavior";
import { ActorComponent } from "../components/ActorComponent";
import { getMutableComponent } from "../../../ecs/functions/EntityFunctions";
import { Vector3 } from "three";
import { getSignedAngleBetweenVectors } from "../../../common/functions/getSignedAngleBetweenVectors";

export const springRotation: Behavior = (entity, args: { timeStep: number; }): void => {
	const actor: ActorComponent = getMutableComponent<ActorComponent>(entity, ActorComponent as any);

	// Spring rotation
	// Figure out angle between current and target orientation
	let angle = getSignedAngleBetweenVectors(actor.orientation, actor.orientationTarget);

	// Simulator
	actor.rotationSimulator.target = angle;
	actor.rotationSimulator.simulate(args.timeStep);
	let rot = actor.rotationSimulator.position;

	// Updating values
	actor.orientation.applyAxisAngle(new Vector3(0, 1, 0), rot);
	actor.angularVelocity = actor.rotationSimulator.velocity;
};