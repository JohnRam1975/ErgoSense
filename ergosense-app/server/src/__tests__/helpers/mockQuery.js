/**
 * Mock de query/runQuery para testes unitários sem banco real.
 */
export function createMockRunQuery(handlers = []) {
  let callIndex = 0;
  return async (sql, params = []) => {
    const handler = handlers[callIndex] ?? handlers[handlers.length - 1];
    callIndex += 1;
    if (typeof handler === 'function') {
      return handler(sql, params, callIndex);
    }
    if (handler && typeof handler === 'object' && 'rows' in handler) {
      return handler;
    }
    return { rows: [], rowCount: 0 };
  };
}

export function rows(data) {
  return { rows: data, rowCount: data.length };
}
