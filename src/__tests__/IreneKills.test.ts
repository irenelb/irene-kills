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
        start: async (name, resource, args) => {
          return { kill: false };
        },
        validator: async (resource) => {
          return resource.text && resource.text.length > 0 ? true : false;
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
      //expect(irene.resource('hello')).toBe('hello');
    });
  });
});
