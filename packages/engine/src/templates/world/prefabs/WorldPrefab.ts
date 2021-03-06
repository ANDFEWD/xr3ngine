import { Prefab } from "@xr3ngine/engine/src/common/interfaces/Prefab";
import { TransformComponent } from "@xr3ngine/engine/src/transform/components/TransformComponent";
import { AssetLoader } from "../../../assets/components/AssetLoader";
import { addObject3DComponent } from "@xr3ngine/engine/src/common/behaviors/Object3DBehaviors";
import { addComponentFromSchema } from "../../../common/behaviors/addComponentFromSchema";
import { addWorldColliders } from "../behaviors/addWorldColliders";

export const WorldPrefab: Prefab = {
    components: [{ type: TransformComponent, data: { position: [0, 0.01, 0]} }],
    onCreate: [
        {
            behavior: addComponentFromSchema,
            args: {
                component: AssetLoader,
                componentArgs: {
                    url: "models/Showroom.glb",
                    receiveShadow: true,
                    castShadow: false,
                    onLoaded: addWorldColliders
                }
            }
        }
    ]
};
