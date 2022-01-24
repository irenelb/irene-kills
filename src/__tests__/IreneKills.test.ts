import { IreneKills } from '../IreneKills';

describe('Irene Kills', function () {
  describe('Configuration', function () {
    it('Create a new instance of Irene', () => {
      const irene = new IreneKills();
    });
    it('Allow to request a resource', async () => {
      const irene = new IreneKills();
      irene.resource('hello', {
        need: async () => {
          return { text: 'hello' };
        },
        check: async (resource) => {
          return resource.text && resource.text.length > 0 ? true : false;
        },
        start: async ({ name, resource, args }) => {
          return { kill: false };
        },
        on: {
          health: async ({ resource }) => {
            return { healthy: resource.text === 'hello' };
          },
          stop: async (resource) => {
            return true;
          },
          sick: false,
          healed: async ({ health }) => {
            return { healed: health.healthy, kill: false };
          },
          //telemetry: {
          //  state: { counter: 0 },
          //  probe: async (msg, { counter }) => {
          //    return { counter: counter + 1 };
          //  },
          //},
        },
      });

      await irene.wakeUp(); // Untill all resources are ready and checked
      //expect(irene.resource('hello')).toBe('hello');
    });
  });
});
