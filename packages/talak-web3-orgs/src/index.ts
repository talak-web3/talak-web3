export type Role = "member" | "admin" | "owner";

export type Organization = {
  id: string;
  name: string;
};

export interface OrgGate {
  hasRole(input: { orgId: string; address: string; role: Role }): Promise<boolean>;
}

