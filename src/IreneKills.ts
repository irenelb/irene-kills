import { FSAManager } from './FSAManager';
import { IreneKillsConstructorArgs } from './types';

type IreneKill = {
  kill: boolean; // Should Kill
};
interface IreneHealthy extends Record<string, unknown> {
  healthy: boolean; // Should Kill
}

type IreneReload = {
  reload: boolean; // Should Reload
};

type HealedReply =
  | {
      kill: boolean;
      healed: false;
    }
  | { healed: true; kill: false };

interface IreneResource<R> {
  need: (name: string) => R | Promise<R>;
  start: (
    name: string,
    resource: R,
    args: IreneReload,
  ) => IreneKill | IreneHealthy | Promise<IreneKill | IreneHealthy>;
  validator: (resource: R, name: string) => boolean | Promise<boolean>;
  on: {
    health: (
      params: {
        resource: R;
        name: string;
      },
      defaultHealth: IreneHealthy,
    ) => IreneHealthy | Promise<IreneHealthy>;
    stop?: (params: {
      resource: R;
      name: string;
    }) => boolean | Promise<boolean>;
    refresh?: (params: { resource: R; name: string }) => {
      acknowledged: boolean;
    };
    sick?:
      | ((params: {
          resource: R;
          name: string;
        }) => IreneKill | Promise<IreneKill>)
      | boolean;
    healed?: (params: {
      resource: R;
      health: IreneHealthy;
      name: string;
    }) => HealedReply | Promise<HealedReply>;
  };
}

export class IreneKills {
  private resources: Record<string, IreneResource<any>> = {};

  resource<V, H extends IreneHealthy>(
    name: string,
    resConfig: IreneResource<V>,
    //telemetry?: {
    //  state: T;
    //  probe: (msg: I[N], oldReport: T) => Promise<T>;
    //};
  ): void {
    if (!resConfig) {
      //access to the resource
      return;
    }
    this.resources[name] = resConfig;
  }
}
