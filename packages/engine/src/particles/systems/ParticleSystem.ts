import { Matrix4, Quaternion, Vector3 } from "three"
import { Object3DComponent } from "../../common/components/Object3DComponent"
import { TransformComponent } from "../../transform/components/TransformComponent"
import { TransformParentComponent } from "../../transform/components/TransformParentComponent"
import { ParticleEmitter, ParticleEmitterState } from "../components/ParticleEmitter"
import { System, Attributes } from "../../ecs/classes/System"
import { registerComponent } from "../../ecs/functions/ComponentFunctions"
import { getComponentOnEntity, addComponentToEntity, removeComponentFromEntity } from "../../ecs/functions/EntityFunctions"
import {
  createParticleEmitter,
  deleteParticleEmitter,
  setEmitterMatrixWorld,
  setEmitterTime
} from "../classes/ParticleEmitter"

export class ParticleSystem extends System {
  init(attributes?: Attributes): void {
    registerComponent(ParticleEmitter)
    registerComponent(ParticleEmitterState)
  }
  execute(deltaTime, time): void {
    for (const entity of this.queryResults.emitters.added) {
      const emitter = getComponentOnEntity(entity, ParticleEmitter) as ParticleEmitter

      const matrixWorld = calcMatrixWorld(entity)
      if (!emitter.useEntityRotation) {
        clearMatrixRotation(matrixWorld)
      }

      const emitter3D = createParticleEmitter(emitter, matrixWorld, time)
      addComponentToEntity(entity, ParticleEmitterState, {
        emitter3D,
        useEntityRotation: emitter.useEntityRotation,
        syncTransform: emitter.syncTransform
      })
    }

    for (const entity of this.queryResults.emitterStates.all) {
      const emitterState = getComponentOnEntity<ParticleEmitterState>(entity, ParticleEmitterState)

      if (emitterState.syncTransform) {
        const matrixWorld = calcMatrixWorld(entity)
        if (!emitterState.useEntityRotation) {
          clearMatrixRotation(matrixWorld)
        }

        setEmitterMatrixWorld(emitterState.emitter3D, matrixWorld, time, deltaTime)
      }

      setEmitterTime(emitterState.emitter3D, time)
    }

    for (const entity of this.queryResults.emitters.removed) {
      //const emitterState = getComponent(entity, ParticleEmitterState)
      removeComponentFromEntity(entity, ParticleEmitterState)
    }

    for (const entity of this.queryResults.emitterStates.removed) {
      const emitterState = getComponentOnEntity(entity, ParticleEmitterState, true) as ParticleEmitterState
      deleteParticleEmitter(emitterState.emitter3D)
    }
  }
}

ParticleSystem.queries = {
  emitters: {
    components: [ParticleEmitter],
    listen: {
      added: true,
      removed: true
    }
  },

  emitterStates: {
    components: [ParticleEmitterState],
    listen: {
      removed: true
    }
  }
}

const clearMatrixRotation = (function() {
  const translation = new Vector3()
  const quaternion = new Quaternion()
  const scale = new Vector3()
  const unitQuat = new Quaternion()

  return function clearMatrixRotation(matrix) {
    matrix.decompose(translation, quaternion, scale)
    return matrix.compose(translation, unitQuat, scale)
  }
})()

const calcMatrixWorld = (function() {
  const scale = new Vector3()
  const rotation = new Quaternion()
  const position = new Vector3()

  return function calcMatrixWorld(entity, childMatrix = undefined) {
    const object3D = getComponentOnEntity(entity, Object3DComponent)
    const transform = getComponentOnEntity<TransformComponent>(entity, TransformComponent)

    if (object3D) {
      return childMatrix ? childMatrix.multiply(object3D["value"].matrixWorld) : object3D["value"].matrixWorld
    } else if (transform) {
      const transformMatrix = new Matrix4()

      transformMatrix.compose(
        position.fromArray(transform.position),
        rotation.fromArray(transform.rotation),
        scale.set(1, 1, 1)
      )

      if (childMatrix) {
        transformMatrix.premultiply(childMatrix)
      }

      const parent = getComponentOnEntity(entity, TransformParentComponent)
      return parent ? calcMatrixWorld(parent["value"], transformMatrix) : transformMatrix
    } else {
      return new Matrix4()
    }
  }
})()