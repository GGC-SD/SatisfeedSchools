# E2E & Unit Tests

This folder contains all test files for the project.

- `e2e/` → Playwright browser-level tests (full user flow simulation)
- `unit/` (inside `src/components/**`) → fast unit/component tests (Vitest)

---

## How to Run Tests

### Runs **unit tests only** (Run this command from within the code/ directory)

```bash
npm test
```

### Runs **end-to-end tests only** (Run this command from within the code/ directory)

Playwright requires the app to be running first.
Step 1: Start the app (Terminal #1):

```bash
cd code
npm run dev
```

Step 2: Run the tests (Terminal #2):

```bash
cd code
npx playwright test
```

NOTE ABOUT CURRENT E2E TEST STATUS

Some map-click tests are temporarily commented out because they depend on pixel-perfect marker click positions, which can behave differently on different screen sizes.

All critical flows (search, dropdowns, navigation, filtering) are working and tested.
Marker precision tests will be re-enabled once test harness includes a stable deterministic coordinate strategy.
