export function createDemo(onTick, timers = globalThis) {
  let timer;
  return {
    start() {
      if (timer !== undefined) return;
      timer = timers.setInterval(onTick, 2800);
    },
    stop() {
      if (timer === undefined) return;
      timers.clearInterval(timer);
      timer = undefined;
    },
  };
}
