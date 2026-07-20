import { TalakWeb3Error, REALTIME_ERROR_CODES } from "@talak-web3/errors";

export interface Message {
  id: string;
  sentAtMs: number;
  from: string;
  body: string;
}

export interface Conversation {
  id: string;
  title?: string;
  participants?: string[];
}

export interface MessagingClient {
  connect(): Promise<void>;
  disconnect(): void;
  listConversations(): Promise<Conversation[]>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, body: string): Promise<{ id: string }>;
  onMessage(handler: (msg: Message & { conversationId: string }) => void): () => void;
}

type WsEnvelope =
  | { type: "ping" }
  | { type: "pong" }
  | { type: "conversations"; items: Conversation[] }
  | { type: "history"; conversationId: string; messages: Message[] }
  | { type: "message"; conversationId: string; message: Message }
  | { type: "sent"; id: string }
  | { type: "error"; code: string; message: string };

type OutboundEnvelope =
  | { type: "list_conversations" }
  | { type: "get_history"; conversationId: string }
  | { type: "send"; conversationId: string; body: string; from: string };

export interface WebSocketMessagingOptions {
  serverUrl: string;
  from: string;
  maxBackoffMs?: number;
}

interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class WebSocketMessagingClient implements MessagingClient {
  private ws: WebSocket | undefined;
  private connected = false;
  private backoffMs = 500;
  private readonly maxBackoffMs: number;
  private destroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  private readonly pendingConversations = new Map<string, PendingRequest<Conversation[]>>();
  private readonly pendingHistory = new Map<string, PendingRequest<Message[]>>();
  private readonly pendingSend = new Map<string, PendingRequest<{ id: string }>>();
  private readonly messageHandlers = new Set<(msg: Message & { conversationId: string }) => void>();

  private boundHandlers?: {
    open: () => void;
    error: (evt: Event) => void;
    close: () => void;
    message: (evt: MessageEvent) => void;
  };

  constructor(private readonly opts: WebSocketMessagingOptions) {
    this.maxBackoffMs = opts.maxBackoffMs ?? 30_000;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.opts.serverUrl);

      this.boundHandlers = {
        open: () => {
          this.connected = true;
          this.backoffMs = 500;
          this.startHeartbeat();
          resolve();
        },
        error: (evt) => {
          if (!this.connected) reject(new Error(`WebSocket connection failed: ${String(evt)}`));
        },
        close: () => {
          this.connected = false;
          this.stopHeartbeat();
          if (!this.destroyed) this.scheduleReconnect();
        },
        message: (evt) => {
          try {
            const envelope = JSON.parse(evt.data as string) as WsEnvelope;
            this.handleEnvelope(envelope);
          } catch {
            /* ignore malformed or non-JSON frames */
          }
        },
      };

      this.ws.addEventListener("open", this.boundHandlers.open);
      this.ws.addEventListener("error", this.boundHandlers.error);
      this.ws.addEventListener("close", this.boundHandlers.close);
      this.ws.addEventListener("message", this.boundHandlers.message);
    });
  }

  disconnect(): void {
    this.destroyed = true;
    this.connected = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws && this.boundHandlers) {
      this.ws.removeEventListener("open", this.boundHandlers.open);
      this.ws.removeEventListener("error", this.boundHandlers.error);
      this.ws.removeEventListener("close", this.boundHandlers.close);
      this.ws.removeEventListener("message", this.boundHandlers.message);
    }

    this.ws?.close();

    const disconnectedError = new Error("Disconnected");
    for (const [, req] of this.pendingConversations) {
      clearTimeout(req.timer);
      req.reject(disconnectedError);
    }
    this.pendingConversations.clear();
    for (const [, req] of this.pendingHistory) {
      clearTimeout(req.timer);
      req.reject(disconnectedError);
    }
    this.pendingHistory.clear();
    for (const [, req] of this.pendingSend) {
      clearTimeout(req.timer);
      req.reject(disconnectedError);
    }
    this.pendingSend.clear();
  }

  async listConversations(): Promise<Conversation[]> {
    const id = crypto.randomUUID();
    return new Promise<Conversation[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingConversations.delete(id);
        reject(new Error("listConversations timeout"));
      }, 10_000);
      this.pendingConversations.set(id, { resolve, reject, timer });
      this.send({ type: "list_conversations" });
    });
  }

  async listMessages(conversationId: string): Promise<Message[]> {
    return new Promise<Message[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingHistory.delete(conversationId);
        reject(new Error("listMessages timeout"));
      }, 10_000);
      this.pendingHistory.set(conversationId, { resolve, reject, timer });
      this.send({ type: "get_history", conversationId });
    });
  }

  async sendMessage(conversationId: string, body: string): Promise<{ id: string }> {
    const msgId = crypto.randomUUID();
    return new Promise<{ id: string }>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingSend.delete(msgId);
        reject(new Error("sendMessage timeout"));
      }, 10_000);
      this.pendingSend.set(msgId, { resolve, reject, timer });
      this.send({ type: "send", conversationId, body, from: this.opts.from });
    });
  }

  onMessage(handler: (msg: Message & { conversationId: string }) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private send(envelope: OutboundEnvelope): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new TalakWeb3Error("WebSocket not connected", {
        code: REALTIME_ERROR_CODES.NOT_CONNECTED,
        status: 503,
      });
    }
    this.ws.send(JSON.stringify(envelope));
  }

  private handleEnvelope(envelope: WsEnvelope): void {
    switch (envelope.type) {
      case "ping":
        this.ws?.send(JSON.stringify({ type: "pong" }));
        break;
      case "pong":
        break;
      case "conversations": {
        for (const [id, req] of this.pendingConversations) {
          clearTimeout(req.timer);
          req.resolve(envelope.items);
          this.pendingConversations.delete(id);
          break;
        }
        break;
      }
      case "history": {
        const req = this.pendingHistory.get(envelope.conversationId);
        if (req) {
          clearTimeout(req.timer);
          req.resolve(envelope.messages);
        }
        this.pendingHistory.delete(envelope.conversationId);
        break;
      }
      case "message": {
        for (const h of this.messageHandlers) {
          h({ ...envelope.message, conversationId: envelope.conversationId });
        }
        break;
      }
      case "sent": {
        const req = this.pendingSend.get(envelope.id);
        if (req) {
          clearTimeout(req.timer);
          req.resolve({ id: envelope.id });
        }
        this.pendingSend.delete(envelope.id);
        break;
      }
    }
  }

  private scheduleReconnect(): void {
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed) {
        void this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          /* best-effort heartbeat; ignore if the socket is closed */
        }
      }
    }, 30_000);
    this.heartbeatTimer.unref?.();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
