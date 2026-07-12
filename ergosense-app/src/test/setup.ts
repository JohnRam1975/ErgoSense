import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { installStorageMock } from './mocks/storage';

installStorageMock();

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url') as typeof URL.createObjectURL;
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
