import _ from 'lodash';
import { FSAManager, Signals } from './FSAManager';

interface IreneKill {
  kill: boolean; // Should Kill
}
interface IreneHealthy {
  healthy: boolean; // Should Kill
}

type HealedReply =
  | {
      kill: boolean;
      healed: false;
    }
  | { healed: true; kill: false };

interface IreneEvents<V> {
  healthcheck?: (
    params: {
      value: V;
      name: string;
    },
    defaultHealth: IreneHealthy,
  ) => IreneHealthy | Promise<IreneHealthy>;
  stop?: (params: { value: V; name: string }) => boolean | Promise<boolean>;
  refresh?: (params: { value: V; name: string; signal: Signals }) =>
    | {
        acknowledged: boolean;
      }
    | Promise<{
        acknowledged: boolean;
      }>;

  healed?: (params: {
    value: V;
    health: IreneHealthy;
    name: string;
  }) => HealedReply | Promise<HealedReply>;
}

interface IreneResource<V> {
  value?: V;
  need?: (params: {
    name: string;
    signal: Signals;
    value: V;
  }) => V | Promise<V>;
  check?: (params: {
    value: V;
    name: string;
    signal: Signals;
  }) => boolean | Promise<boolean>;
  activate?: (params: {
    name: string;
    value: V;
    reload: boolean; // Should Reload
    signal: Signals;
  }) => (IreneKill & IreneHealthy) | Promise<IreneKill & IreneHealthy>;
  healthy?: (params: {
    name: string;
    value: V;
    signal: Signals;
  }) => (IreneKill & IreneHealthy) | Promise<IreneKill & IreneHealthy>;
  sick?:
    | ((params: { value: V; name: string }) => IreneKill | Promise<IreneKill>)
    | boolean;
  on?: IreneEvents<V>;
}

export class IreneKills {
  private resources: Record<string, IreneResource<any>> = {};
  private fsm = new FSAManager({
    states: {
      initialize: {
        activate: async ({ current, signal }) => {
          try {
            const results = await Promise.all(
              _(this.resources)
                .map(async (resource, name) => {
                  if (!resource.need)
                    return await { name, resource, value: resource.value };

                  return {
                    name,
                    resource,
                    value: await resource.need({
                      name,
                      signal,
                      value: resource.value,
                    }),
                  };
                })
                .value(),
            );

            results.map(({ resource, value }) => {
              resource.value = value;
            });
            return { forwardTo: 'check', results };
          } catch (e) {
            /* handle error */
            //throw e;
            return { forwardTo: 'Irene', error: e };
          }
        },
      },
      check: {
        activate: async ({ signal }) => {
          try {
            const results = await Promise.all(
              _(this.resources)
                .map(async (resource, name) => {
                  if (!resource.check)
                    return await { name, resource, value: true };

                  return {
                    name,
                    resource,
                    value: await resource.check({
                      name,
                      value: resource.value,
                      signal,
                    }),
                  };
                })
                .value(),
            );
            const ok = results.reduce((acc, { value }) => {
              return acc && value;
            }, true as boolean);
            if (!ok) {
              return { forwardTo: 'Irene' };
            }
          } catch (e) {
            /* handle error */
            //throw e;
            return { forwardTo: 'Irene' };
          }

          return { forwardTo: 'activate' };
        },
      },
      activate: {
        activate: async ({ current, signal }) => {
          try {
            const results = await Promise.all(
              _(this.resources)
                .map(async (resource, name) => {
                  if (!resource.activate)
                    return await {
                      name,
                      resource,
                      value: {
                        kill: false,
                        healthy: true,
                        reload: false,
                        signal,
                      },
                    };

                  return {
                    name,
                    resource,
                    value: await resource.activate({
                      name,
                      value: resource.value,
                      reload: false,
                      signal,
                    }),
                  };
                })
                .value(),
            );
            const { kill, healthy } = results.reduce(
              (acc, { value }) => {
                return {
                  kill: acc.kill || value.kill,
                  healthy: acc.healthy && (value.healthy ?? true),
                };
              },
              { kill: false, healthy: true } as IreneKill & IreneHealthy,
            );
            if (kill) return { forwardTo: 'Irene' };
            if (!healthy) return { forwardTo: 'sick' };
          } catch (e) {
            /* handle error */
            //throw e;
            return { forwardTo: 'Irene' };
          }
          return { forwardTo: 'healthy' };
        },
      },
      healthy: {
        activate: async ({ current, signal }) => {
          try {
            const results = await Promise.all(
              _(this.resources)
                .map(async (resource, name) => {
                  if (!resource.healthy)
                    return await {
                      name,
                      resource,
                      value: { kill: false, healthy: true },
                    };

                  return {
                    name,
                    resource,
                    value: await resource.healthy({
                      name,
                      value: resource.value,
                      signal,
                    }),
                  };
                })
                .value(),
            );
          } catch (e) {
            /* handle error */
            //throw e;
            return { forwardTo: 'Irene' };
          }
        },
      },
      sick: {
        activate: async ({ current, signal }) => {
          try {
            const results = await Promise.all(
              _(this.resources)
                .map(async (resource, name) => {
                  if (!resource.sick || typeof resource.sick === 'boolean')
                    return await {
                      name,
                      resource,
                      decision: { kill: false },
                    };

                  return {
                    name,
                    resource,
                    decision: await resource.sick({
                      name,
                      value: resource.value,
                    }),
                  };
                })
                .value(),
            );
            const killDecision = results.reduce(
              (acc, { name, resource, decision }) => {
                acc.kill = acc.kill || decision.kill;
                if (decision.kill)
                  acc.killers.push({ name, value: resource.value });
                return acc;
              },
              {
                kill: false,
                killers: [],
              } as {
                kill: boolean;
                killers: { name: string; value: unknown }[];
              },
            );
            if (killDecision.kill) return { forwardTo: 'Irene' };
          } catch (e) {
            /* handle error */
            //throw e;
            return { forwardTo: 'Irene' };
          }
        },
      },
      Irene: {
        activate: async ({ current, signal }) => {
          this.kill(signal);
        },
      },
    },
    transitions: {
      wakeup: [
        { current: 0, success: 'initialize', failure: 'Irene' },
        { current: 'initialize', success: 'check', failure: 'Irene' },
        { current: 'check', success: 'activate', failure: 'Irene' },
        { current: 'activate', success: 'healthy', failure: 'Irene' },
        { current: 'activate', success: 'sick', failure: 'Irene' },
        { current: 'healthy', success: 'sick', failure: 'Irene' },
      ],
      refresh: [
        { current: 'healthy', success: 'initialize', failure: 'Irene' },
      ],
      health: [
        { current: 'healthy', success: 'healthy', failure: 'sick' },
        { current: 'sick', success: 'sick', failure: 'Irene' },
        { current: 'sick', success: 'healthy', failure: 'Irene' },
      ],
      sick: [
        { current: 'healthy', success: 'sick', failure: 'Irene' },
        { current: 'sick', success: 'sick', failure: 'Irene' },
        { current: 'sick', success: 'healthy', failure: 'Irene' },
      ],
      stop: [
        { current: 'healthy', success: 'Irene', failure: 'Irene' },
        { current: 'sick', success: 'Irene', failure: 'Irene' },
      ],
    },
  });

  kill(reason?: any) {
    setImmediate(() => {
      process.exit(reason === 'stop' ? 0 : 1);
    });
  }

  mood() {
    return this.fsm.state();
  }
  resource<R>(
    name: string,
    resConfig: IreneResource<R>,
    //telemetry?: {
    //  state: T;
    //  probe: (msg: I[N], oldReport: T) => Promise<T>;
    //};
  ): this {
    if (this.resources[name]) {
      throw new Error(`Resource [${name}] already exists`);
    }
    if (resConfig) {
      this.resources[name] = resConfig;
    }
    return this;
  }

  async wakeUp(opt?: { timeout: number | null }): Promise<void> {
    if (this.fsm.state() !== 0) {
      return;
    }
    return timeout(opt?.timeout ?? null, () => this.fsm.signal('wakeup'));
  }
  async healtcheck(opt?: { timeout: number | null }): Promise<{
    healthy: boolean;
    resources: Record<string, IreneHealthy>;
    errors: Record<string, any>;
  }> {
    return timeout(opt?.timeout ?? null, async () => {
      await this.fsm.awaitState('healthy');

      const healthcheck = await Promise.all(
        _(this.resources)
          .map(async (resource, name) => {
            if (!resource?.on?.healthcheck) {
              return { name, resource, response: undefined };
            }
            try {
              return {
                name,
                resource,
                response: await resource.on.healthcheck(
                  { name, value: resource.value },
                  {} as IreneHealthy,
                ),
              };
            } catch (e) {
              return { name, resource, response: undefined, error: e };
            }
          })
          .value(),
      );
      const summary = healthcheck.reduce(
        (acc, { name, response, error }) => {
          return {
            healthy: acc.healthy && (response?.healthy ?? true),
            resources: {
              ...acc.resources,
              [name]: response ?? { healthy: true },
            },
            errors: { ...acc.errors, [name]: error ?? false },
          };
        },
        { healthy: true, resources: {}, errors: {} } as {
          healthy: boolean;
          resources: Record<string, IreneHealthy>;
          errors: Record<string, any>;
        },
      );

      if (!summary.healthy) await this.fsm.signal('sick');
      return summary;
    });
  }
}

function timeout<R, T extends () => Promise<R>>(
  ms: number | null,
  fn: T,
): Promise<R> {
  if (!ms) return fn();
  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject('timeout');
      }, ms);
    }) as never,
  ]);
}
