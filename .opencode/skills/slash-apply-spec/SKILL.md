---
name: slash-apply-spec
description: Extending (and replacing) /opsx-apply slashCommand. Design parallelization strategy and apply tasks.
license: GPL
metadata:
  author: "Paul Park"
  version: "1.0"
---


Apply the OpenSpec changes provided above to the codebase (= proceed with software development).

By default, the agent should **favor aggressive yet safe parallelization where it provides clear efficiency gains**. When precision or ordering is critical, don't compromise parallelization, but instead do 'batched parallelization' where batches have dependencies. 

<playbook>

##0. Familiarize OpenSpec Usage
First, as a guide for applying specs using OpenSpec, the agent calls `opsx-apply`. The agent should read this skill, but must continue with the remaining steps without losing focus.

##1. Delegate planning
First, the agent triggers (1+n) plan agents in the following structure. (2<n<4) 
 
1: parallelization strategy  
n(2..4): implementation strategies. Split tasks into large chunks by similar size and theme, and distribute them across the plan agents.

```
asyncagents_task(agent="plan", prompt="PLAN SCENARIO: PLAN_PARALLELIZATION_STRATEGY.
RELATED_OPENSPEC_DOCS: "openspec/changes/an-openspec-change, openspec/specs/an-openspec-spec, ..."
Design an agent delegation strategy that distributes the above tasks as efficiently as possible.", fork=true)

asyncagents_task(agent="plan", prompt="PLAN SCENARIO: PLAN_IMPLEMENTATION_STRATEGY.
RELATED_OPENSPEC_TASKS: "openspec/changes/an-openspec-change/tasks.md:50-85, ..."
Brainstorm implementation approaches for the above tasks and derive the optimal solution.", fork=true)
```

Wait while these plan agents are running.

##2. Write TODOs
Insert the parallelization strategy plans proposed by the first plan agent directly into the TODO LIST. 
Then, add `plan testing` to the TODO LIST.

##3. Parallel coding & test planning
Execute 3A and 3B simultaneously. First, start 3A) the initial parallel execution of coding agents, and while waiting, proceed with 3B) test planning.

###3A. Multi-agent parallel coding
Run programmer agents in parallel according to the plan. 

Carefully consider the sub-agent dependencies provided by the plan agents, and execute them across multiple rounds as needed. Here, you can note your findings found from the implementation planner agents.
Programmer agents may occasionally request clarification during their work. In such cases, respond with an answer using `resume=id`.

###3B. Testing plan
Spawn plan agents in the following manner.  
First, trigger n plan agents (1<n<3).  
Split test scenarios into large chunks by similar size and theme, and distribute them across plan agents. Prefer using a single agent where possible, but if overlap is minimal (e.g., backend vs frontend, admin vs non-admin features), multiple plan agents may be spawned.

```
asyncagents_task(agent="plan", prompt="PLAN SCENARIO: PLAN_TESTING_STRATEGY.
RELATED_OPENSPEC_CHANGES: "openspec/changes/an-openspec-change/*, ..."
The implementation of this OpenSpec spec is now complete. Prepare scenarios that can test whether all implemented tasks and features function correctly.", fork=true)
```

##4. Run tests
Spawn tester agents according to the testing plan completed by the plan agents. Tester agents must be run with `fork=false`, and the following 7-Section structure should be used as the prompt (in most cases, it can be filled almost entirely based on what the plan agent provided):

```
CONTEXT:
Briefly describe what the project is, its purpose, and the current development stage.

TEST OBJECTIVES:
Clearly state what must be validated in this testing round and what is explicitly out of scope.

RELATED OPENSPEC DIRECTORY:
Specify the exact OpenSpec directory or files that define the expected behavior being tested.

CONSTRAINTS:
List hard limits, forbidden actions, assumptions, and environmental restrictions the tester must follow.

HOW TO TEST:
Step-by-step playbook the tester strictly has to follow.
Explain the testing approach, methodology, and tools to use.

SUCCESS CRITERIA:
Define the exact conditions under which the test is considered a pass or a failure. Provide at least five checkboxes.

MUST INCLUDE:
The planner will by default report comprehensively most things, but you can specify things that must be included.
```

Explain how to perform testing from the perspective of a tester who is seeing and testing this project for the first time.

##5. Documentation
For each OpenSpec task that has been fully completed, tasks should be check marked by the test agents. 

You should iterate all steps above dynamically to check all tasks (but you should NOT check directly)

Once all tasks are checked off, execute the following skills in order:
`opsx:verify`
`opsx:archive`

If any issues arise at any stage, take appropriate corrective actions and ensure that the process is completed successfully.

</playbook>
