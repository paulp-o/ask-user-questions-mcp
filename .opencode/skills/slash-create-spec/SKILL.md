---
name: slash-create-spec
description: Extending (and replacing) /openspec-proposal slashCommand. Design and craft the best spec interactively.
license: GPL
metadata:
  author: "Paul Park"
  version: "1.0"
---


You called this skill because you need to create a **new OpenSpec change** in order to develop a new feature.

Following the **OpenSpec development flow**, you must write a spec that:

* reflects the user’s intent as much as possible,
* is fully detailed,
* is precise step by step,
* includes step-by-step granular tasks and plans,
* includes the sources of background information (links, code snippets...),
* contains **no unclear or ambiguous points**.

<playbook>

##1. Precondition Check — Spec Context Verification
Before this skill is invoked, the agent must verify that the discussion history includes all of the following:
[ ] Whether an OpenSpec spec is involved, and if so, which specific spec it is

##2. Knowledge Base Collection — Parallel Exploration & Research
The agent **must run at least 3 Explore agents and 3 Researcher agents in parallel** as an initial knowledge base collection and **WAIT** for completion.

The analysis must cover:

**Explore agents:**
* the existing codebase,
* git commit history.

**Note:** Existing OpenSpec documents must be read directly by the agent, not delegated to explore agents.

**Researcher agents:**
* relevant web resources that may be helpful,
* libraries or technologies that can be used to implement the feature, including their suitability and limitations,
* exploration of example implementations or structural analysis from open-source project codebases.

The analysis must include **all** of the following topics:

* **INTENT** – What is the developer trying to achieve through this spec?
* **IMPLEMENTATION** – How should the feature be implemented?
* **DESIGN** – What design is required to express the intent and functionality?

Agents may be recursively resumed for additional research if needed.

##2.5. Question Strategy Planning — Plan Agent Analysis
After exploration completes, the agent **must spawn a Plan agent** to analyze information gaps and design the question strategy:

```
asyncagents_task(agent="plan", fork=true, prompt="
  PLAN SCENARIO: PLAN_QUESTION_STRATEGY
  
  CONTEXT:
  - User's original request: [summary]
  - Explore findings: [key discoveries]
  - Researcher findings: [external references]
  
  TASK:
  Analyze what information is still missing and design a question strategy.
  Identify decisions that require explicit user intent (not inferrable from codebase).
  
  OUTPUT:
  - Information gaps and their impact
  - Question categories with priorities
  - What each answer unlocks (downstream decisions)
  - Questions to SKIP (inferrable from context)
  - Decision tree for follow-up questions
")
```

The agent **must wait** for the Plan agent to complete before proceeding to AUQ.
Use the Plan agent's output to structure and prioritize questions in Step 3.

##3. Ambiguity Resolution — AUQ-Driven Clarification
Using the question strategy from Step 2.5, clarify all ambiguous points using the AUQ tool.

* At least **3 sets of questions** must be asked in parallel.
* Follow-up questions may continue without limit.
* The target is **50 to 100 total questions**, depending on task size:
  * Small feature changes (no new technology or major refactoring): ~20 questions
  * Large feature changes (new libraries, entirely new major functionality, etc.): ~50 questions

* **BLOCKING:** The question counts above are guidelines only. Questions must always proceed recursively toward stronger, more detailed planning. If earlier answers imply additional questions or considerations, the agent must aggressively continue questioning. Questioning may exceed 100 questions unless the user explicitly requests otherwise.
* **BLOCKING:** Minimal questions count: 20.
* **BLOCKING:** If a single spec becomes too large with dozens of subparts, the agent must split it into multiple specs.
* **IMPORTANT:** Asking meaningless questions just to reach a quota is strictly prohibited. Only necessary questions should be asked—questions that resolve essential design decisions and planning uncertainties. Remember: during this phase, the agent is a **sharp and critical planning assistant**.

##4. Spec Generation — Fast-Forward & Document Authoring

###4A: The agent runs the `/opsx-ff`.

###4B: After that, the agent generates the OpenSpec document by using the `document-writer` agent with `fork=true`.  

* Each OpenSpec artifact is created step by step. After completing one artifact, the agent resumes the `document-writer` agent to generate the next artifact, continuing until the spec is fully ready for implementation (apply).
* [IMPORTANT] The agent must prompt the `document-writer` agent to run related openspec instructions command first before generating each artifact, and which step it should work on. 


##5. Reporting — Output & Customization Guidance
The agent reports all generated files to the user.

The agent must also identify the **top 5 documents (with line numbers)** that the user is most likely to want to customize.

##6. Post-Generation Handling — Apply Request Guard
If the user immediately requests to apply the spec at this point, the agent must **refuse** and instead guide the user to open a new session.

</playbook>