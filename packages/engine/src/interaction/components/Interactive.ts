import { Component } from "../../ecs/classes/Component";
import { Types } from "../../ecs/types/Types";
import { Behavior } from "../../common/interfaces/Behavior";
import { InteractionCheckHandler } from "../types";

export class Interactive extends Component<Interactive> {
  static schema = {
    interactiveDistance: { type: Types.Number, default: Infinity },
    onInteractionCheck: { type: Types.Ref },
    onInteractionFocused: { type: Types.Ref },
    onInteraction: { type: Types.Ref },
    data: { type: Types.Ref }
  }

  public onInteractionCheck:InteractionCheckHandler
  public onInteraction:Behavior
  public onInteractionFocused:Behavior
  public interactiveDistance:number
  public data:any
}