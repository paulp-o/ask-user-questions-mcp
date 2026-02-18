---
name: slash-bugfix
description: Structured workflow for debugging and fixing bugs.
license: MIT
metadata:
  author: "MAD-Agentic-System"
  version: "1.0"
---

Structured workflow for debugging and fixing bugs.

**Input**: Bug description, error message, stack trace, or reproduction steps. Can also reference an issue number or existing OpenSpec change.

**Steps**

1. **Understand the bug**

   Gather information:
   - Error message or unexpected behavior
   - Steps to reproduce
   - Expected vs actual behavior
   - When it started (recent change? always broken?)

   If information is missing, use **AskUserQuestion tool** to clarify:
   > "Can you share the error message or steps to reproduce?"

2. **Reproduce the bug**

   Before fixing, confirm you can reproduce it:
   - Run the failing test (if exists)
   - Execute the reproduction steps
   - Capture the actual error/behavior

   **If cannot reproduce**: Ask for more details or check environment differences.

3. **Locate root cause**

   Use tools systematically:
   ```
   grep/osgrep  → Find relevant code by error message or function name
   lsp_references → Trace function calls and usages
   read          → Examine suspicious code sections
   ```

   Build a hypothesis:
   - What line/function is causing the issue?
   - Why is it failing? (logic error, edge case, null reference, etc.)

   **If root cause is unclear after 2 attempts**: 
   Consult **Genius** agent with:
   - Error message and stack trace
   - Code snippets examined
   - Hypotheses tried and ruled out

4. **Plan the fix**

   Before coding:
   - Identify the minimal change needed
   - Consider side effects on other code
   - Check if a test exists (or should be added)

   For complex fixes, create TODOs:
   ```
   - [ ] Fix the null check in processData()
   - [ ] Add test for edge case
   - [ ] Update related validation
   ```

5. **Implement the fix**

   Make minimal, focused changes:
   - Fix only what's broken
   - Don't refactor unrelated code
   - Preserve existing behavior for non-broken cases

6. **Verify the fix**

   Run verification in order:
   ```bash
   # 1. Type check
   bun run typecheck  # or tsc --noEmit
   
   # 2. Targeted test
   bun test <specific-test-file>
   
   # 3. Broader test suite
   bun test
   ```

   Also verify:
   - Original reproduction steps now work
   - No new errors introduced
   - Related functionality still works

7. **Document (if needed)**

   For non-trivial fixes:
   - Add inline comment explaining the fix
   - Update relevant documentation
   - Consider adding a regression test


**Output During Debugging**

```
## Debugging: <brief bug description>

### 1. Understanding
- Error: <error message>
- Repro: <steps or test>

### 2. Investigation
- Examining: <file:line>
- Hypothesis: <what might be wrong>

### 3. Root Cause
✓ Found: <explanation of the bug>

### 4. Fix
- File: <path>
- Change: <brief description>
```

**Output On Success**

```
## Bug Fixed ✓

**Problem**: <what was broken>
**Cause**: <why it was broken>
**Fix**: <what was changed>

**Verification**:
- [x] Types check
- [x] Tests pass
- [x] Reproduction steps now work

**Files changed**:
- `path/to/file.ts` - <brief change description>
```

**Output On Block**

```
## Debugging Paused

**Bug**: <description>
**Status**: <where we're stuck>

**Tried**:
- <approach 1> → <result>
- <approach 2> → <result>

**Options**:
1. <next approach to try>
2. Consult Genius for deeper analysis
3. Get more information from user

What would you like to do?
```


**Guardrails**

- **Reproduce first** - Never fix a bug you can't reproduce
- **Minimal changes** - Fix only what's broken, don't refactor
- **Verify before done** - Run tests, don't assume the fix works
- **Don't suppress errors** - No `as any`, `@ts-ignore`, or empty catch blocks
- **Ask if stuck** - After 2 failed attempts, consult Genius or ask user
- **One bug at a time** - Don't try to fix multiple issues in one session
- **Preserve behavior** - Don't change working functionality
- **Test edge cases** - If the bug was an edge case, add a test for it
