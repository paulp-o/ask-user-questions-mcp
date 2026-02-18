---
name: slash-nonspec-modification
description: Lightweight modification workflow for bug fixes, typos, config changes, and small refactoring that don't require OpenSpec artifacts.
license: GPL
metadata:
  author: "Paul Park"
  version: "1.0"
---

Lightweight modification workflow for changes that don't require OpenSpec artifacts.

**When to use this skill:**
- Bug fixes with clear error/stacktrace
- Typo fixes
- Config/setting changes
- Dependency version updates
- Small refactoring (variable rename, function extraction)

**When to redirect to OpenSpec:**
- New feature additions
- API/interface changes
- Data model changes

If any of the above OpenSpec criteria are detected, stop and suggest: "This change requires new spec. You might want to roll back and start over."


## Flow Decision

Classify the request at the start:

```
User Request
    │
    ├─ Has error message / stacktrace / "bug" keyword
    │   └─ → [Bug Flow]
    │
    └─ No error (typo, config, refactor, etc.)
        └─ → [Simple Fix Flow]
```

**Flow transitions are allowed:**
- Simple Fix → Bug Flow: If modification reveals deeper issues, upgrade
- Bug Flow → Simple Fix: If Explore reports "complexity: LOW", downgrade to save resources


## Bug Flow

For requests with error messages, stacktraces, or explicit bug reports.

### Step 1: Parallel Investigation

Fire **5+ Explore agents** AND **Researcher** in parallel:

```typescript
// Explore agents - investigate codebase
asyncagents_task(agent="explore", prompt="
  TASK: Investigate bug - [error description]
  FIND: Related code, call paths, recent changes
  ASSESS COMPLEXITY (include this line in response):
  complexity: HIGH or LOW
  
  HIGH if any:
  - Spans 3+ modules/files
  - Root cause unclear
  - Async/concurrency/race condition involved
  - Deep in external library
")

// Researcher - external context
asyncagents_task(agent="researcher", prompt="
  TASK: Research [error message / library name]
  FIND: Known issues, solutions, documentation
")
```

**Wait for ALL agents to complete** before proceeding.

### Step 2: Complexity Check

Parse Explore responses for `complexity:` line:
- If ANY Explore reports `complexity: HIGH` → Fire **Genius** immediately
- If ALL report `complexity: LOW` → Consider downgrading to Simple Fix Flow

```typescript
// If complex
asyncagents_task(agent="genius", fork=true, prompt="
  TASK: Analyze complex bug
  CONTEXT: [Explore findings]
  PROVIDE: Root cause analysis, fix strategy, verification plan
")
```

### Step 3: Delegate Fix to Programmer

Delegate to **Programmer** with `fork=true`:

```typescript
asyncagents_task(agent="programmer", fork=true, prompt="
  TASK: Fix bug - [description]
  ROOT CAUSE: [from investigation]
  FILES TO MODIFY: [file list]
  
  MUST DO:
  - Implement minimal fix
  - Run lsp_diagnostics after edit
  - Run tests if available
  - Report success/failure with evidence
  
  MUST NOT:
  - Modify files outside allowlist
  - Refactor unrelated code
  - Suppress errors with as any / @ts-ignore
")
```

**For parallelizable tasks:** Fire parallel Programmers with clear file allowlists.


## Simple Fix Flow

For typos, config changes, dependency updates, small refactoring.

### Step 1: Light Investigation

Fire **2+ Explore agents** in parallel:

```
asyncagents_task(agent="explore", prompt="
  TASK: Find location for [change description]
  FIND: Relevant files, current implementation
")
```
  
[BLOCKING] If related to external library (version update, config), also fire Researcher:
```
asyncagents_task(agent="researcher", prompt="
  TASK: Check [library name] for [version/config change]
  FIND: Migration guides, breaking changes, best practices
")
```
[BLOCKING] If the task seems to have hidden complexity (multiple files, unclear scope), consider firing Genius agent for analysis:
```
asyncagents_task(agent="genius", prompt="...
```

### Step 2: Plan implementation & parallelization (skippable)

Spawn a **Plan agent** to design both implementation and parallelization strategy.
This step is optional; for very simple changes (typos, small config tweaks), you may skip directly to Step 3.

### Step 3: Delegate to Programmer

Directly delegate to **Programmer** with `fork=true`:

```
asyncagents_task(agent="programmer", fork=true, prompt="...")  // Follow 8-section prompt
```

### Flow Upgrade

If Programmer reports unexpected complexity or repeated failures:
- Upgrade to Bug Flow
- Fire additional Explore agents
- Consider Genius consultation


## Verification

**Programmer is responsible for verification** (not main agent).

Programmer must:
1. Run `lsp_diagnostics` on changed files - **REQUIRED**
2. Run related tests if they exist - **REQUIRED if tests exist**
3. Manual verification if no tests - **REQUIRED**
4. Build step - **SKIP if tests pass**

Programmer reports back with evidence:
```
Fix applied: [description]
Files changed: [list]
lsp_diagnostics: ✓ clean
Tests: ✓ passed (or "no tests, manually verified")
```


## Failure Handling

**Definition of "1 failure":**
- Programmer completes fix but lsp_diagnostics fails
- Programmer completes fix but tests fail
- Programmer reports "unable to fix"

**Failure escalation:**

```
Attempt 1 fails → Retry with adjusted approach
Attempt 2 fails → Retry with different strategy  
Attempt 3 fails → Call Genius
                      │
                      ├─ Genius provides analysis
                      │   └─ Retry with Genius guidance
                      │
                      └─ Genius also fails
                          └─ Ask user: "What would you like to do?"
                              - Continue trying
                              - Switch to OpenSpec workflow
                              - Get manual help
```

**When calling Genius after failures:**
```typescript
asyncagents_task(agent="genius", fork=true, prompt="
  TASK: Debug repeated fix failures
  
  ATTEMPTS MADE:
  1. [approach] → [result]
  2. [approach] → [result]
  3. [approach] → [result]
  
  ERROR/FAILURE: [details]
  
  PROVIDE:
  - Root cause analysis
  - Why previous attempts failed
  - Recommended fix strategy
  - Verification approach
")
```


## Guardrails

**MUST DO:**
- Use TODO tool to track progress
- Report detailed status (files changed, verification results)
- Wait for ALL Explore agents before proceeding (Bug Flow)
- Delegate actual code changes to Programmer
- Verify with lsp_diagnostics before declaring success

**MUST NOT:**
- Suggest commit after completion (just report done)
- Suppress errors with `as any`, `@ts-ignore`, `@ts-expect-error`
- Let Programmer modify files outside their allowlist
- Skip verification step
- Proceed with OpenSpec-level changes (redirect instead)

**REDIRECT TO OPENSPEC if:**
- New feature/capability needed
- API or interface changes required
- Data model/schema changes required

Say: "This change requires new spec. You might want to roll back and start over."
