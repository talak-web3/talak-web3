import { toNextJsHandler } from "talak-web3/nextjs";

import { app } from "../../../talak.config";

const handler = toNextJsHandler(app);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const PATCH = handler.PATCH;
export const DELETE = handler.DELETE;
