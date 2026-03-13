---
name: elnora-agent
description: >
  This skill should be used when the user asks about "Elnora agent capabilities",
  "what can the agent do", "agent tools", "web search", "academic search",
  "PubMed", "ArXiv", "Exa", "Tavily", "Perplexity", "Valyu", "ToolUniverse",
  "scientific tools", "agent memory", "code execution", "sandbox",
  "search papers", "search literature", "drug discovery", "protein analysis",
  "clinical trials", "file operations", "agent skills",
  or any question about what the Elnora AI Agent can do when you send it a task.
  Routes to domain-specific sub-skills for token-efficient guidance.
---

# Elnora Agent Capabilities

The Elnora Agent is a LangGraph CodeAct agent with a persistent Python REPL sandbox. It has ~76 core tools + 2,100+ ToolUniverse scientific tools.

**You interact with the agent through a single CLI endpoint:**

```bash
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"

# Create a task and send the first message
$CLI --compact tasks create --project <PROJECT_ID> --title "My task" --message "Your request here"

# Continue the conversation
$CLI --compact tasks send <TASK_ID> --message "Follow-up request"

# Read the agent's response
$CLI --compact tasks messages <TASK_ID> --limit 5
```

The agent executes Python code in a sandboxed REPL. All tools are callable as plain Python functions in the sandbox. Variables persist across executions within the same task.

## Routing Table

| Need | Sub-skill | Tools | Trigger keywords |
|------|-----------|-------|------------------|
| Web search (Tavily, Exa, Valyu, Perplexity) | `elnora-agent-search` | 34 | web search, Tavily, Exa, Valyu, Perplexity, neural search, crawl |
| Academic/scientific databases | `elnora-agent-academic` | 12 | PubMed, ArXiv, UniProt, papers, clinical trials, ChEMBL, Wolfram |
| Platform file/task operations | `elnora-agent-platform` | 11 | create file, save file, read file, link file, search files, progress |
| Tool/skill/catalog discovery + ToolUniverse | `elnora-agent-discovery` | 10 + 2,100 TU | find tool, ToolUniverse, catalog, discover, skill, methodology |
| Context & memory management | `elnora-agent-memory` | 9 | remember, recall, findings, scratchpad, conversation summary |

## Summary

| Category | Count | Type |
|----------|-------|------|
| Platform (file/task ops) | 11 | Internal — .NET backend |
| Web Search (Tavily/Exa/Valyu/Perplexity) | 34 | External APIs |
| Academic/Scientific | 12 | Free direct APIs |
| Catalog Discovery | 2 | Internal reference system |
| Skill Discovery | 3 + 36 skills | Internal knowledge base |
| ToolUniverse Meta-Tools | 5 + 2,100 tools | Scientific tool database |
| Context Management | 4 | LangGraph Store |
| Memory Management | 5 | Long-term persistent store |
| Code Execution (sandbox) | 1 | Python REPL |
| **Total** | **~76 core + 2,100 TU** | **~2,176 tools** |

## Code Execution (Sandbox)

- Persistent Python REPL per task (variables survive across executions)
- Pre-loaded: `json`, `re`, `math`, `pandas` (pd), `numpy` (np)
- All tools injected as plain Python functions
- Limits: 30s timeout, 1MB output max

## Agent Recipes

**Ask the agent to search the web:**

```bash
$CLI --compact tasks create --project "$PROJECT" --title "Web research" \
  --message "Search the web for recent CRISPR delivery methods using Tavily and Exa"
```

**Ask the agent to find academic papers:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Search PubMed for BRCA1 mutation papers from 2024, then check Semantic Scholar for citation counts"
```

**Ask the agent to use ToolUniverse:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Use ToolUniverse to find protein structure prediction tools, then run AlphaFold on this sequence: MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSH"
```

**Ask the agent to remember something across tasks:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Remember that our lab uses Taq polymerase for all PCR protocols and annealing at 58C"
```
