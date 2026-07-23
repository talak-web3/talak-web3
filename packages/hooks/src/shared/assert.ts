export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[@talak-web3/hooks] ${message}`);
  }
}

export function assertContext<T>(value: T | null, name: string): asserts value is T {
  assert(
    value !== null,
    `${name} not found. Did you forget to wrap your component in <TalakWeb3Provider>?`,
  );
}
