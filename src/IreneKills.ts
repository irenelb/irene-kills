import { runMain } from 'module';
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
  start: (params: {
    name: string;
    resource: R;
    args: IreneReload;
  }) => IreneKill | IreneHealthy | Promise<IreneKill | IreneHealthy>;
  check: (resource: R, name: string) => boolean | Promise<boolean>;
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
  private fsm = new FSAManager({
    initialState: 'initial',
    states: {
      initial: {
        execute: async () => {
          /* do stuff */
        },
        active: async () => {
          /*do stuff*/
        },
        leaving: async () => {
          /*do stuff*/
        },
      },
      check: {},
      started: {},
      sick: {},
      Irene: {},
    },
    transitions: {
      wakeup: [{ current: 'initial', success: 'check', failure: 'Irene' }],
      refresh: [{ current: 'started', success: 'initial', failure: 'Irene' }],
      health: [
        { current: 'started', success: 'started', failure: 'sick' },
        { current: 'sick', success: 'sick', failure: 'Irene' },
      ],
      stop: [
        { current: 'started', success: 'Irene', failure: 'Irene' },
        { current: 'sick', success: 'Irene', failure: 'Irene' },
      ],
    },
  });

  resource<R, H extends IreneHealthy>(
    name: string,
    resConfig: IreneResource<R>,
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

  async wakeUp(): Promise<void> {
    return await this.fsm.signal('wakeup');
  }
  async healtcheck(): Promise<void> {
    return await this.fsm.signal('health', this.resources);
  }
}
