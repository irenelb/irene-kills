type Signals = 'wakeup' | 'refresh' | 'health' | 'stop';
export class FSAManager<States extends string> {
  private transitions: Record<
    Signals,
    {
      current: States;
      success: States;
      failure: States;
    }[]
  >;

  private FSAState: { current: States };

  constructor({
    initialState,
    transitions,
  }: {
    initialState: States;
    states: Record<States, any>;
    transitions: Record<
      Signals,
      {
        current: States;
        success: States;
        failure: States;
      }[]
    >;
  }) {
    this.FSAState = { current: initialState };
    this.transitions = transitions;
  }

  async signal(signal: Signals) {
    const signalTransistions = this.transitions[signal];
    const haveATransition = signalTransistions.find(
      (t) => t.current === this.FSAState.current,
    );
    if (haveATransition) {
      try {
        tryChangeState({
          current: this.FSAState.current,
          to: haveATransition.success,
        });
      } catch (e) {
        tryChange({
          current: this.FSAState.current,
          to: haveATransition.failure,
        });
      }
      this.FSAState.current = haveATransition.success;
      return haveATransition.success;
    }
  }
}
function tryChangeState(arg0: { current: string; to: string }) {
  throw new Error('Function not implemented.');
}
