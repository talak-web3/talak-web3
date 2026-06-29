import { AsyncLocalStorage } from "node:async_hooks";

type RequestStateStore = WeakMap<object, unknown>;

const requestStateStorage = new AsyncLocalStorage<RequestStateStore>();

export function runWithRequestState<T>(fn: () => T): T {
  return requestStateStorage.run(new WeakMap(), fn);
}

export function runWithRequestStateAsync<T>(fn: () => Promise<T>): Promise<T> {
  return requestStateStorage.run(new WeakMap(), fn);
}

function getCurrentStore(): RequestStateStore {
  const store = requestStateStorage.getStore();
  if (!store) {
    throw new Error(
      "No request state found. Call runWithRequestState or runWithRequestStateAsync first.",
    );
  }
  return store;
}

export interface RequestState<T> {
  get(): T;
  set(value: T): void;
}

export function defineRequestState<T>(initFn: () => T): RequestState<T> {
  const ref = Object.freeze({});

  return {
    get() {
      const store = getCurrentStore();
      if (!store.has(ref)) {
        store.set(ref, initFn());
      }
      return store.get(ref) as T;
    },
    set(value) {
      getCurrentStore().set(ref, value);
    },
  };
}
