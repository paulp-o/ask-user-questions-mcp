---
name: example-skill
description: An example skill demonstrating the programmatic skill definition pattern.
license: MIT
metadata:
  author: "MAD-Agentic-System"
  version: "1.0"
---

This is an example skill that demonstrates the programmatic skill definition pattern.

**Purpose**: Show how to define skills using TypeScript with modular prompt composition.

**Steps**

1. Define your skill using `defineSkill()` in `modules/src/skills/<name>/index.ts`
2. Create modular content in `prompts/` subfolder
3. Import and register in `modules/src/skills/index.ts`
4. Run build to generate SKILL.md files

**Guardrails**

- Skills are static content (no template variables)
- Use kebab-case for skill names
- Avoid names that conflict with openspec-* skills