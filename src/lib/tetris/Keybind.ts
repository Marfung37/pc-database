export type Action = 'left' | 'right' | 'hold' | 'cw' | 'ccw' | '180' | 'sd' | 'hd' | 'd1' | 'reset';
export type Bindings = Record<Action, string>;
type Subscriber = (bindings: Bindings) => void;

const DEFAULT: Bindings = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  hold: 'ShiftLeft',
  cw: 'KeyS',
  ccw: 'KeyA',
  180: 'KeyD',
  sd: 'ArrowDown',
  hd: 'Space',
  d1: 'KeyH',
  reset: 'KeyR'
};

class Keybind {
  private binding: Bindings;
  private storageKey: string;
  private subscribers: Subscriber[];

  constructor(binding: Bindings, storageKey: string) {
    this.binding = binding;
    this.storageKey = storageKey;
    this.subscribers = [];
  }

  set(action: Action, key: string): void {
    this.binding[action] = key;
    this.notify();
  }

  get(action: Action): string {
    return this.binding[action];
  }

  subscribe(run: Subscriber): () => void {
    this.subscribers.push(run);
    run(this.binding);
    return () => {
      this.subscribers = this.subscribers.filter(fn => fn !== run);
    };
  }

  notify() {
    this.subscribers.forEach(fn => fn(this.binding));
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.binding));
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  reset(defaultBinds: Bindings = DEFAULT) {
    this.binding = { ...defaultBinds };
    this.save();
    this.notify();
  }
}

export const keybinds = new Keybind(DEFAULT, 'keybinds');
