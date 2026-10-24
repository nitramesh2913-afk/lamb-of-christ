import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// Server-side tests run in the node environment, where localStorage does not exist.
beforeEach(() => globalThis.localStorage?.clear());
afterEach(() => cleanup());
