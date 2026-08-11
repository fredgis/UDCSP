import '@testing-library/jest-dom/vitest';
Object.defineProperty(window, 'crypto', { value: crypto, configurable: true });
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null, configurable: true });
