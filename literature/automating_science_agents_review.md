# Literature Review: Automating Science with AI Agents

**Date:** January 2025
**Focus:** Implications for Claude Code scaffolding and AI alignment research

---

## Executive Summary

The field of AI-driven scientific automation has exploded in 2024-2025, with multiple systems demonstrating end-to-end autonomous research capabilities. Key milestones include:

- **AI Scientist-v2** (Sakana, 2025): First peer-reviewed AI-generated workshop paper
- **AI co-scientist** (Google/Gemini, 2025): Multi-agent hypothesis generation with wet-lab validation
- **Virtuous Machines** (August 2025): Domain-agnostic system completing full psychology studies

This review synthesizes architectural patterns, tools, and best practices from 20+ papers, with specific recommendations for improving Claude Code's research automation capabilities.

---

## 1. Key Systems and Architectures

### 1.1 The AI Scientist (v1 → v2 Evolution)

**v1 (Sakana, August 2024):**
- First comprehensive framework for fully automatic scientific discovery
- Required human-authored code templates
- Limited to specific ML domains

**v2 (April 2025):**
- **Eliminates template dependence** - generalizes across ML domains
- Progressive agentic tree-search with dedicated **Experiment Manager Agent**
- AI Reviewer with VLM loop for iterative figure refinement
- Produced first fully AI-generated peer-reviewed paper (ICLR workshop)

**Key Insight:** The v1→v2 transition shows that **removing human scaffolding (templates)** enables broader applicability, but requires more sophisticated search and self-critique mechanisms.

### 1.2 AI co-scientist (Google, 2025)

Multi-agent architecture with six specialized agents:

| Agent | Role |
|-------|------|
| **Generation** | Creates hypotheses via debate, literature exploration, assumption identification |
| **Reflection** | Multi-level reviews (initial, full, deep verification, simulation) |
| **Ranking** | Elo-based tournaments with pairwise scientific debates |
| **Proximity** | Builds similarity graphs for clustering related ideas |
| **Evolution** | Refines hypotheses through grounding, combination, divergent thinking |
| **Meta-Review** | Synthesizes patterns from reviews to improve subsequent iterations |

**Novel contributions:**
- **Tournament-based ranking** using multi-turn debates
- **Feedback propagation without fine-tuning** (appending meta-review insights to prompts)
- **Scientist-in-the-loop** rather than full automation
- Validated drug candidates showing tumor inhibition in wet-lab experiments

### 1.3 Data-to-Paper (NEJM AI, 2024)

Focus on **transparency and verifiability**:
- Stepwise research process mimicking human practices
- Programmatic back-tracing of information flow
- In autopilot mode: 80-90% accuracy for simple research goals
- Human co-piloting becomes critical as complexity increases

**Key Insight:** The information tracing approach (linking results → methods → data) is underutilized in current scaffolds.

### 1.4 Agent Laboratory (Microsoft, 2025)

Three-stage pipeline:
1. **Literature Review** (identified as the weakest stage)
2. **Experimentation**
3. **Report Writing**

Enables user feedback at each stage. Finding: "significant performance drop during the literature review phase" - this is a known hard problem.

### 1.5 Buck Shlegeris Architecture (Redwood Research, 2024)

Three logically separated servers for AI research agents:

1. **Inference Server:** Hosts LLM, provides API access
2. **Scaffold Server:** Manages agent state, orchestrates interactions, maintains context
3. **Execution Server:** Sandboxed code execution with controlled tool access

**Security insight:** Physical separation matters for threat modeling. An agent on a user's laptop has fundamentally different attack capabilities than one in a datacenter.

---

## 2. Benchmarks and Evaluation

### 2.1 ScienceAgentBench (October 2024)

- 102 tasks from 44 peer-reviewed publications across 4 disciplines
- Validated by 9 subject matter experts
- Unified output: self-contained Python program files

**Sobering Results:**
- Best agent: 32.4% task completion independently
- With expert knowledge: 34.3%
- o1-preview: 42.2% but at 10x cost
- **Conclusion:** Agents "lack proficiency in generating code for data-driven discovery"

### 2.2 DiscoveryWorld (NeurIPS 2024, Allen AI)

- 120 challenge tasks across 8 scientific topics
- 3 difficulty levels with parametric variations
- Evaluates: task completion, procedural progress, explanatory knowledge

**Performance Gap:**
- Human scientists with advanced degrees excel
- Leading LLMs complete <20% of Normal/Challenge tasks
- Rarely discover requisite explanatory knowledge

### 2.3 RE-Bench (METR, 2024)

Research Engineering Benchmark comparing AI agents vs human experts:
- 7 open-ended ML research engineering environments
- Human experts tested over 8-hour sessions
- At 2-hour budget: best AI agents competitive
- At 8-hour budget: humans significantly outperform

### 2.4 InnovatorBench (2025)

Evaluates end-to-end innovative LLM research:
- Data Construction, Filtering, Augmentation
- Loss Design, Reward Design, Scaffold Construction
- Requires runnable artifacts, not just paper writing

---

## 3. Key Challenges Identified

### 3.1 Literature Review Automation (Critical Gap)

Multiple papers identify this as the hardest problem:
- Agent Laboratory shows "significant performance drop" at this stage
- ResearchAgent lacks structured review capabilities
- **Recommendation:** Develop specialized literature review tools/agents

### 3.2 Trustworthiness & Reliability

- Avoiding overfitting to benchmarks
- Balancing accuracy, cost, speed, throughput
- Improving explainability and safety mechanisms
- Hallucinations particularly dangerous in high-stakes domains

### 3.3 Human-AI Collaboration Balance

Spectrum from full automation to "scientist-in-the-loop":
- Full automation struggles with novel reasoning
- Pure assistance underutilizes AI capabilities
- **Sweet spot:** Human oversight at critical junctures (hypothesis validation, interpretation)

---

## 4. Tools and Frameworks

### 4.1 Agent Orchestration

| Framework | Focus |
|-----------|-------|
| AutoGen | Multi-agent management |
| MetaGPT | Software development emphasis |
| Letta | Persistent agents with cognitive architecture |
| LangChain | General-purpose chains |
| E2B Sandboxes | Secure code execution environments |

### 4.2 Domain-Specific Tools

- **ChemCrow:** 18 domain-specific tools for chemistry
- **ToolUniverse:** 600+ scientific tools (ML models, databases, simulators)
- **AlphaFold integration** for protein structure
- **Specialized databases** (Cancer Dependency Map, FDA drug lists)

### 4.3 Novel Tool Patterns

**TOOLMAKER (ACL 2025):** Agents that autonomously create tools from code repositories:
- Motivated by scientific papers with public code
- Enables domain adaptation without manual tool implementation
- **Highly relevant for alignment research** where new techniques emerge rapidly

**POPPER (Stanford):** Automated hypothesis testing with agentic sequential falsifications

---

## 5. Recommendations for Claude Code Scaffolding

Based on this literature review, here are specific recommendations:

### 5.1 New Tools to Consider

| Tool | Description | Rationale |
|------|-------------|-----------|
| **Literature Search Agent** | Specialized agent for academic paper search, synthesis, gap identification | Identified as critical bottleneck in multiple papers |
| **Hypothesis Tracker** | Structured tracking of hypotheses with evidence, confidence, falsification attempts | Core to scientific method, not well-supported currently |
| **Experiment Registry** | Log experiments with parameters, results, and relationships | Enables systematic exploration and prevents redundant work |
| **Elo-based Idea Ranking** | Tournament-style comparison of competing hypotheses/approaches | Validated by AI co-scientist as effective for prioritization |
| **Information Provenance** | Track data → analysis → conclusion chains | Critical for reproducibility and debugging |
| **Tool Generator** | Create new tools from code repositories | TOOLMAKER pattern - expand capabilities dynamically |

### 5.2 Architectural Improvements

1. **Progressive Tree Search**
   - Current: Linear exploration
   - Recommended: Agentic tree search with backtracking (AI Scientist-v2 pattern)
   - Implementation: Track exploration branches, allow revisiting abandoned paths

2. **Multi-Agent Debate**
   - Current: Single-agent reasoning
   - Recommended: Separate "generator" and "critic" agents
   - AI co-scientist showed this improves hypothesis quality

3. **Meta-Review Loop**
   - Current: No systematic learning from session patterns
   - Recommended: Synthesize patterns from reviews to improve prompts
   - Can be implemented without fine-tuning (prompt augmentation)

4. **Execution Sandboxing**
   - Current: Direct bash execution
   - Recommended: Separate execution environment with controlled access
   - Buck's architecture emphasizes this for safety

### 5.3 Strategies for AI Alignment Research

Specific considerations for interpretability/alignment work:

1. **SAE/Feature Analysis Pipeline**
   - Automate activation extraction → dictionary learning → feature interpretation
   - Tools: activation caching, feature visualization, circuit tracing

2. **Automated Alignment Auditing**
   - Anthropic (July 2025) developed agents that:
     - Uncover hidden goals
     - Build behavioral evaluations
     - Surface concerning behaviors
   - Consider similar structured auditing capabilities

3. **Hypothesis Testing for Mechanistic Interpretability**
   - POPPER-style falsification testing
   - "Does this feature really correspond to X?" with systematic ablation

4. **Cross-Paper Pattern Synthesis**
   - Alignment research is fragmented across papers
   - Tool to identify connections between findings

### 5.4 Process Improvements

1. **Fail Fast with Rich Context**
   - Current: Errors can be opaque
   - Recommended: Capture full context at failure (stack trace, tensor shapes, inputs)
   - Align with your "fail fast philosophy"

2. **Checkpoint Scientific Progress**
   - Save hypothesis state, experimental results, interpretations
   - Enable resumption after interruption
   - Track which hypotheses have been tested/falsified

3. **Structured Literature Notes**
   - Not just file dumps but structured extraction:
     - Key findings
     - Methodology
     - Limitations
     - Connections to other work

---

## 6. Gaps in Current Literature

Areas underexplored that may be relevant:

1. **Long-horizon Research Projects**
   - Most systems optimize for single-session completion
   - Multi-day/week research projects need different patterns

2. **Negative Results Handling**
   - How to productively learn from failed experiments
   - Most systems focus on successful outcomes

3. **Calibrated Uncertainty**
   - When to be confident vs. uncertain about findings
   - Critical for safety research

4. **Collaborative Human-AI Iteration**
   - Most systems are either full-auto or single-consultation
   - Richer dialogue patterns needed

---

## 7. Key Papers Reference List

### Core Systems
1. **Virtuous Machines: Towards Artificial General Science** (2508.13421) - Domain-agnostic autonomous research
2. **The AI Scientist-v2** (2504.08066) - First peer-reviewed AI paper
3. **AI co-scientist** (2502.18864) - Multi-agent hypothesis generation
4. **Data-to-Paper** (2404.17605) - Transparent, traceable research automation
5. **Agent Laboratory** (2501.04227) - Three-stage research pipeline

### Benchmarks
6. **ScienceAgentBench** (2410.05080) - Data-driven discovery evaluation
7. **DiscoveryWorld** (NeurIPS 2024) - Virtual environment for discovery agents
8. **RE-Bench** (METR 2024) - Research engineering comparison

### Surveys
9. **Agentic AI for Scientific Discovery** (2503.08979) - Comprehensive survey
10. **From Automation to Autonomy** (2505.13259) - LLMs in scientific discovery

### Architecture & Safety
11. **A basic systems architecture for AI agents** (LessWrong, Buck 2024)
12. **Building and evaluating alignment auditing agents** (Anthropic, 2025)

### Tools & Methods
13. **TOOLMAKER** (ACL 2025) - Agents creating agent tools
14. **POPPER** (Stanford) - Agentic hypothesis falsification
15. **CodeScientist** (ACL 2025) - Genetic search over code + papers

---

## 8. Conclusion

The field has progressed remarkably fast. Key takeaways:

1. **Literature review remains the hardest problem** - needs specialized tools
2. **Multi-agent architectures outperform single agents** - especially with debate/critic patterns
3. **Information provenance is critical** - track data→analysis→conclusion chains
4. **Scientist-in-the-loop beats full automation** for novel research
5. **Code execution sandboxing** is both a safety and reliability concern
6. **Tool generation** (TOOLMAKER pattern) enables rapid domain adaptation

For AI alignment research specifically, the combination of:
- Structured hypothesis tracking
- Systematic falsification (POPPER)
- Alignment auditing agents (Anthropic pattern)
- Cross-paper synthesis

...could significantly accelerate mechanistic interpretability and safety research.

---

*Report generated from literature review of 20+ papers on AI-driven scientific automation, January 2025*
