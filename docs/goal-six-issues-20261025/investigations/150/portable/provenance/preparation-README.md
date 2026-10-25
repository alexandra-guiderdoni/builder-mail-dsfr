# Modal iframe routing — portable reproduction candidate

This package preserves the synthetic minimal R3 scenario that previously recorded a complete trusted click inside an opaque iframe while the parent reported an open modal at message receipt. It is a **reproduction candidate**, not a product fix or a deterministic failure guarantee. The portable variant has passed pure tests only; it has not been installed or run in a browser yet.

The parent page uses a native modal dialog and `pointer-events:none` on the preview while the dialog is open. The scenario performs positive iframe controls before and after two modal cycles, Cancel then Confirm. Its background gesture remains one raw `page.mouse.click(1365,990)` per cycle. It uses explicit child counter probes already present in R3. Coordinates, HTML, assertions, counters, oracle and cleanup are unchanged.

## Obtain and review

No public repository URL is assigned to this candidate. Copy the supplied directory. If it is later published in an approved repository, clone that repository and enter the directory containing this `package.json`; no placeholder URL is a currently verified clone command.

Review the package and `provenance/runner.diff` before installation or execution. A report or successful pure test grants no authority to run a native test. The internal provenance retains the original local source path for byte verification; it is not a runtime configuration and should be reviewed before any upstream publication.

## Proposed installation and one run — not executed here

Use Node.js 24.18.0 to match the prior native study (package engine minimum: Node 20). From this directory, after separate approval:

```sh
npm ci --ignore-scripts
npm test
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" ./node_modules/.bin/playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" node run.cjs --run-once ./result-once
```

Playwright is exactly **1.64.1**, also checked at runtime. The lock contains the exact registry URLs and SHA512 integrities of Playwright and playwright-core from the existing parent lock. No dependency installation, registry download or browser installation was performed during preparation. The lock was constructed from those entries and checked for dependency closure; `npm ci` portability remains untested. Browser download requires network access and writes only to the explicitly selected local browser directory in this recipe. No system dependency installer is included.

`result-once` must not exist. The runner refuses an existing directory and requires exactly `--run-once NEW_OUTPUT_DIRECTORY`. It launches its own browser; it never attaches to a personal session. **One future run maximum for the proposed qualification; no automatic retries.** Importing `run.cjs` neither resolves Playwright nor launches the browser.

## Read the result

`result-once/result.json` preserves errors and cleanup errors, the two cycles, recorded events and the original finding. Exit 0 means the protocol completed, not that the finding is positive. Read `finding.routingObserved` and the reconciled counters. `true` records excess complete child clicks in a modal cycle. `false` is limited non-reproduction of complete clicks; it does **not** exclude partial pointer/mouse events (the separate R5 study demonstrated that distinction).

The only additional result field is `environment`, with `platform`, `arch`, `osRelease`, `node` and `playwright`. No hostname, username or environment-variable dump is collected. The pre-existing browserVersion remains unchanged. Package resolution paths are not added to the JSON.

Child events contain the parent's modal state **at message receipt**, not proof of the parent's state at the exact child event time. Event IDs and counter reconciliation do not establish physical input, separate renderer processes or an internal Chromium cause. Snapshot reads are intrusive; their DOM hit-test does not attest compositor routing freshness. Fresh file URLs and installation environment can affect reproduction. A negative run must not trigger an automatic loop or be presented as resolution of the original issue.

## Pure checks performed

```sh
node --test pure.test.cjs reconcile.test.cjs portable.test.cjs
node --check run.cjs
```

21/21 pure tests passed. The six portability tests verify the exact inverse runner delta, unchanged fixture and contract bytes, lock entries and closure, import behavior, explicit invocation gate, and the metadata allowlist. The original fifteen tests remain byte-identical. Logs and exact commands are under `results/`; `MANIFEST.json` records this preparation's file hashes.
