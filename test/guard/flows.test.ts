import { create, flow, Flows } from '../../src';
import { Model } from '../../index';

describe('guard Flows.debounce', () => {
  class UpdateModel implements Model<number> {
    state: number = 0;

    increase() {
      return this.state + 1;
    }

    @flow(Flows.debounce({ leading: true, time: 200 }))
    update() {
      this.increase();
    }
  }

  test('debounce with leading status', async () => {
    const { connect, agent, disconnect } = create(UpdateModel);
    connect();
    agent.update();
    expect(agent.state).toBe(1);
    agent.update();
    expect(agent.state).toBe(1);
    await new Promise(resolve => setTimeout(resolve, 100));
    agent.update();
    expect(agent.state).toBe(1);
    await new Promise(resolve => setTimeout(resolve, 210));
    agent.update();
    expect(agent.state).toBe(2);
    disconnect();
  });
});

describe('guard Flows.block', () => {
    class UpdateModel implements Model<number> {
        state: number = 0;

        increase() {
            return this.state + 1;
        }

        @flow(Flows.block())
        update() {
            this.increase();
        }
    }

  test('block a sync method', () => {
      const { connect, agent, disconnect } = create(UpdateModel);
      connect();
      agent.update();
      agent.update();
      expect(agent.state).toBe(2);
      disconnect();
  });
});
