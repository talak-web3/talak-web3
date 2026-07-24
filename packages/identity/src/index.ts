import type { CeramicAdapter } from "@talak-web3/adapters";

/** Unified user profile combining DID, ENS, and wallet address. */
export type UnifiedProfile = {
  did?: string;
  ens?: string;
  address?: string;
};

/** Service for managing decentralized identities via Ceramic Network. */
export class IdentityService {
  constructor(private readonly ceramic?: CeramicAdapter) {}

  async ensureCeramicProfile(input: { did: string }): Promise<{ id: string }> {
    if (!this.ceramic) return { id: "disabled" };
    return this.ceramic.createProfile({ did: input.did });
  }
}
