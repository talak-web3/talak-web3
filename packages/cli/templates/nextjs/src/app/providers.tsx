"use client";

import { TalakWeb3Provider } from "talak-web3/react";

import { app } from "../talak.config";

void app.init();

export function Providers({ children }: { children: React.ReactNode }) {
  return <TalakWeb3Provider instance={app}>{children}</TalakWeb3Provider>;
}
