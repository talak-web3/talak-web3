import { describe, it, expect, vi } from "vitest";

import { toNextJsHandler } from "../handler.js";

describe("toNextJsHandler", () => {
  it("should return handler with all HTTP methods", async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));

    const routeHandler = toNextJsHandler(mockHandler);

    expect(routeHandler).toHaveProperty("GET");
    expect(routeHandler).toHaveProperty("POST");
    expect(routeHandler).toHaveProperty("PUT");
    expect(routeHandler).toHaveProperty("PATCH");
    expect(routeHandler).toHaveProperty("DELETE");
    expect(typeof routeHandler.GET).toBe("function");
    expect(typeof routeHandler.POST).toBe("function");
    expect(typeof routeHandler.PUT).toBe("function");
    expect(typeof routeHandler.PATCH).toBe("function");
    expect(typeof routeHandler.DELETE).toBe("function");
  });

  it("should call the handler function with the request", async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));

    const routeHandler = toNextJsHandler(mockHandler);
    const request = new Request("http://localhost:3000/api/auth/test", {
      method: "GET",
    });

    const response = await routeHandler.GET(request);

    expect(mockHandler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });

  it("should call the same handler for all HTTP methods", async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));

    const routeHandler = toNextJsHandler(mockHandler);

    const getRequest = new Request("http://localhost:3000/api/auth/test", {
      method: "GET",
    });
    const postRequest = new Request("http://localhost:3000/api/auth/test", {
      method: "POST",
    });
    const putRequest = new Request("http://localhost:3000/api/auth/test", {
      method: "PUT",
    });
    const patchRequest = new Request("http://localhost:3000/api/auth/test", {
      method: "PATCH",
    });
    const deleteRequest = new Request("http://localhost:3000/api/auth/test", {
      method: "DELETE",
    });

    await routeHandler.GET(getRequest);
    await routeHandler.POST(postRequest);
    await routeHandler.PUT(putRequest);
    await routeHandler.PATCH(patchRequest);
    await routeHandler.DELETE(deleteRequest);

    expect(mockHandler).toHaveBeenCalledTimes(5);
    expect(mockHandler).toHaveBeenNthCalledWith(1, getRequest);
    expect(mockHandler).toHaveBeenNthCalledWith(2, postRequest);
    expect(mockHandler).toHaveBeenNthCalledWith(3, putRequest);
    expect(mockHandler).toHaveBeenNthCalledWith(4, patchRequest);
    expect(mockHandler).toHaveBeenNthCalledWith(5, deleteRequest);
  });

  it("should accept object with handler property", async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));

    const auth = { handler: mockHandler };
    const routeHandler = toNextJsHandler(auth);
    const request = new Request("http://localhost:3000/api/auth/test", {
      method: "POST",
    });

    const response = await routeHandler.POST(request);

    expect(mockHandler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });

  it("should handle async handler errors", async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error("Handler error"));

    const routeHandler = toNextJsHandler(mockHandler);
    const request = new Request("http://localhost:3000/api/auth/test", {
      method: "GET",
    });

    await expect(routeHandler.GET(request)).rejects.toThrow("Handler error");
  });

  it("should return response from handler", async () => {
    const mockResponse = new Response(JSON.stringify({ data: "test" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const mockHandler = vi.fn().mockResolvedValue(mockResponse);

    const routeHandler = toNextJsHandler(mockHandler);
    const request = new Request("http://localhost:3000/api/auth/test", {
      method: "GET",
    });

    const response = await routeHandler.GET(request);
    const body = await response.json();

    expect(response).toBe(mockResponse);
    expect(body).toEqual({ data: "test" });
  });
});
