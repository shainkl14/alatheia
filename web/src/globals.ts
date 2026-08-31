import { Buffer } from 'buffer';

const g = globalThis as typeof globalThis & {
  process?: unknown;
  Buffer?: typeof Buffer;
};

if (typeof g.process === 'undefined') {
  Object.defineProperty(g, 'process', {
    value: {
      env: { NODE_ENV: import.meta.env.MODE || 'production' },
      version: '',
      cwd: () => '/',
    },
    configurable: true,
  });
}

if (typeof g.Buffer === 'undefined') {
  g.Buffer = Buffer;
}
