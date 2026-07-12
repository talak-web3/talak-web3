import { defineRequestState } from "./request-state.js";

const shouldSkipSessionRefreshState = defineRequestState<boolean>(() => false);

export function getShouldSkipSessionRefresh(): boolean {
  return shouldSkipSessionRefreshState.get();
}

export function setShouldSkipSessionRefresh(skip: boolean): void {
  shouldSkipSessionRefreshState.set(skip);
}

export function resetShouldSkipSessionRefresh(): void {
  shouldSkipSessionRefreshState.set(false);
}
