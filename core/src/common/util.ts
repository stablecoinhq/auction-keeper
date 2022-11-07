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
