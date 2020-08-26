import { StateSchemaValue } from '../../../state/interfaces/StateSchema';
import { ActorComponent } from '../components/ActorComponent';
import { setActorAnimation } from "../behaviors/setActorAnimation";
import { initializeCharacterState } from "../behaviors/initializeCharacterState";
import { updateCharacterState } from "../behaviors/updateCharacterState";
import { CharacterStateGroups } from '../CharacterStateGroups';
import { jumpRunning } from "../behaviors/jumpRunning";

export const JumpRunningState: StateSchemaValue = {
  group: CharacterStateGroups.MOVEMENT,
  componentProperties: {
    component: ActorComponent,
    properties: {
      ['velocitySimulator.mass']: 100,
      ['velocityTarget']: { x: 0, y: 0, z: 0 },
      ['alreadyJumped']: false
    }
  },
  onEntry:  [
      {
        behavior: initializeCharacterState
      },
      {
        behavior: setActorAnimation,
        args: {
          name: 'jump_running',
          transitionDuration: 0.03
        }
      }
  ],
  onUpdate: [
    { behavior: updateCharacterState,
    args: {
      setCameraRelativeOrientationTarget: true
    }
  },
    { behavior: jumpRunning }
  ]
};