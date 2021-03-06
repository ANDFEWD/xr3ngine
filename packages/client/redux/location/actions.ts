import {
  LOCATIONS_RETRIEVED,
  INSTANCES_RETRIEVED
} from '../actions';

import { InstanceServerProvisionResult } from '@xr3ngine/common/interfaces/InstanceServerProvisionResult';

export interface LocationsRetrievedAction {
  type: string;
  locations: any[];
}

export type LocationsAction =
  LocationsRetrievedAction

export function locationsRetrieved (locations: any): LocationsRetrievedAction {
  return {
    type: LOCATIONS_RETRIEVED,
    locations: locations
  };
}