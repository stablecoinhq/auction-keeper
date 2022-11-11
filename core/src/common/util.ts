// https://medium.com/@chris_marois/asynchronous-locks-in-modern-javascript-8142c877baf

export class AsyncLock {
  private _promise: Promise<void>;

  private _disable: () => void;

  constructor() {
    this._disable = () => {};
    this._promise = Promise.resolve();
  }

  /**
   * Run given async function with lock
   * @param job Async function to run
   * @returns
   */
  async run<T>(job: () => Promise<T>): Promise<T> {
    await this._promise;
    this._enable();
    const result = await job().finally(() => this._disable());
    return result;
  }

  private _enable() {
    // eslint-disable-next-line no-promise-executor-return
    this._promise = new Promise((resolve) => (this._disable = resolve));
  }
}

/**
 * Split into ranges of blocks
 * This is to avoid full node from throwing error when fetching past events
 * @param fromBlock Oldest block
 * @param latest Highest block
 * @returns
 */
 export function splitBlocks(
  fromBlock: number,
  latest: number
): { from: number; to: number }[] {
  const SPLIT_BY = 10000;
  const ls: { from: number; to: number }[] = [];
  for (let i = fromBlock; i <= latest; i += SPLIT_BY) {
    const from = i;
    const to = i + SPLIT_BY >= latest ? latest : i + SPLIT_BY;
    ls.push({ from, to });
  }
  return ls;
}