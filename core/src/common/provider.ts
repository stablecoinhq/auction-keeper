/* eslint-disable max-classes-per-file */
import { ethers } from "ethers";
// https://github.com/ethers-io/ethers.js/issues/1053#issuecomment-1220391512

const WEBSOCKET_PING_INTERVAL = 10000;
const WEBSOCKET_PONG_TIMEOUT = 5000;
const WEBSOCKET_RECONNECT_DELAY = 100;
const WEBSOCKET_RECONNECT_DELAY_ON_ERROR = 5000;

const WebSocketProviderClass =
  (): new () => ethers.providers.WebSocketProvider => class {} as never;

export class WebSocketProvider extends WebSocketProviderClass() {
  private provider?: ethers.providers.WebSocketProvider;

  private events: ethers.providers.WebSocketProvider["_events"] = [];

  private requests: ethers.providers.WebSocketProvider["_requests"] = {};

  onReconnect: Map<string, () => Promise<void>> = new Map();

  private isReconnecting: boolean = false;

  // https://ja.javascript.info/proxy
  private handler = {
    get(target: WebSocketProvider, prop: string, receiver: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value =
        (target.provider && Reflect.get(target.provider, prop, receiver)) ??
        Reflect.get(target, prop, receiver);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value instanceof Function ? value.bind(target.provider) : value;
    },
  };

  constructor(private providerUrl: string) {
    super();
    this.create();

    // eslint-disable-next-line no-constructor-return
    return new Proxy(this, this.handler);
  }

  private create() {
    if (this.provider) {
      this.events = [...this.events, ...this.provider._events];
      this.requests = { ...this.requests, ...this.provider._requests };
    }

    const provider = new ethers.providers.WebSocketProvider(
      this.providerUrl,
      this.provider?.network?.chainId
    );
    let pingInterval: NodeJS.Timer | undefined;
    let pongTimeout: NodeJS.Timeout | undefined;

    provider._websocket.on("open", () => {
      pingInterval = setInterval(() => {
        provider._websocket.ping();

        pongTimeout = setTimeout(() => {
          provider._websocket.terminate();
        }, WEBSOCKET_PONG_TIMEOUT);
      }, WEBSOCKET_PING_INTERVAL);

      const event = this.events.pop();
      while (event) {
        provider._events.push(event);
        provider._startEvent(event);
      }

      if (this.isReconnecting) {
        this.isReconnecting = false;
        this.onReconnect.forEach((job) => void job());
      }

      for (const key in this.requests) {
        provider._requests[key] = this.requests[key];
        provider._websocket.send(this.requests[key].payload);
        delete this.requests[key];
      }
    });

    provider._websocket.on("pong", () => {
      if (pongTimeout) clearTimeout(pongTimeout);
    });

    provider._websocket.on("close", (code: number) => {
      provider._wsReady = false;
      console.log(`Error occured while connecting ${code}`);
      this.isReconnecting = true;

      if (pingInterval) clearInterval(pingInterval);
      if (pongTimeout) clearTimeout(pongTimeout);

      if (code === 1006) {
        setTimeout(() => this.create(), WEBSOCKET_RECONNECT_DELAY_ON_ERROR);
      } else if (code !== 1000) {
        setTimeout(() => this.create(), WEBSOCKET_RECONNECT_DELAY);
      }
    });

    // Don't need to do anything, just let 'close' handle it
    provider._websocket.on("error", () => {});

    this.provider = provider;
  }
}
