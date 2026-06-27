export interface CeramicAdapter {
  createProfile(input: { did: string }): Promise<{ id: string }>;
}

export interface TablelandAdapter {
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
}

export interface StorageAdapter {
  put(path: string, data: Uint8Array): Promise<{ uri: string }>;
  get(uri: string): Promise<Uint8Array>;
}

export * from "./ceramic";
export * from "./tableland";
export * from "./storage";
