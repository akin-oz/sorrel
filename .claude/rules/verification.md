# Rule: Deterministic Verification

## Context
We do not ship code on "vibes" or assumptions. Code is only considered complete when verified by automated compilation and test suites within the exact same runtime turn.

## Forbidden Vocabulary
* "This should work now."
* "Untested but looks correct."
* "I have implemented X, please run the tests to check."

## Strict Execution Protocol
1. **Zero-Tolerance Policy:** You are forbidden from claiming a task is complete until you have locally executed the verification commands and verified a clean exit code.
2. **Mandatory Loop:** Every time you modify TypeScript code, schema components, or business logic, you must immediately trigger:
   ```bash
   yarn type-check && yarn lint
    ```