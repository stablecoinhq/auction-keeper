//https://medium.com/@chris_marois/asynchronous-locks-in-modern-javascript-8142c877baf
export class AsyncLock {
    promise: Promise<void>;
    disable: () => void;
  
    constructor() {
      this.disable = () => {};
      this.promise = Promise.resolve();
    }
  
    enable() {
      this.promise = new Promise((resolve) => (this.disable = resolve));
    }
  }