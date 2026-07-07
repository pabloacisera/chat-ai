const mockDb: Record<string, any> = {
  exec: () => mockDb,
  prepare: () => ({
    run: () => ({}),
    all: () => [],
    get: () => undefined,
    bind: () => ({}),
    finalize: () => ({}),
  }),
  close: () => undefined,
  transaction: (fn: Function) => fn,
  pragma: () => undefined,
};

function Database(path: string) {
  return mockDb;
}

export default Database;
