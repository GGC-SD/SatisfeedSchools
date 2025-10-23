import { vi } from "vitest";

// Stub out your firebase config wherever it's imported as "@/firebase/firebaseConfig"
vi.mock("@/firebase/firebaseConfig", () => ({
  db: {},
}));

// Stub Firestore calls used by overlays
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
}));

import { ResizeObserver as RO } from "@juggle/resize-observer";
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? RO;
