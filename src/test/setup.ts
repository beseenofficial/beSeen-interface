import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  // Some suites run in the node environment (no DOM globals).
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});
