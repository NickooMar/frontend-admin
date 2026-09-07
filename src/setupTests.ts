// jest-dom adds custom matchers for asserting on DOM nodes (toBeInTheDocument, ...).
import '@testing-library/jest-dom/vitest'

// Radix Select/Dropdown rely on pointer-capture and scrollIntoView, which jsdom lacks.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}
