import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

// jsdom lacks these; components call them for scrolling and focus management.
Element.prototype.scrollTo = function scrollTo() {};
window.scrollTo = () => {};
