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
---

# Elnora Agent Capabilities

The Elnora Agent is a sandboxed Python environment with ~78 core tools + 2,100 ToolUniverse scientific tools. You interact via `tasks send` — don't reference internal tool names, just describe what you need in plain language.

```bash
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"

# Create a task
$CLI --compact tasks create --project <PROJECT_ID> --title "My task" --message "Your request"

# Continue conversation
$CLI --compact tasks send <TASK_ID> --message "Follow-up request"

# Read response
$CLI --compact tasks messages <TASK_ID> --limit 5
```

## What the agent can do

| Capability | Examples |
|------------|----------|
| **Web search** (34 tools) | Real-time search, neural/semantic search, deep research, URL extraction, site crawling. Providers: Tavily, Exa, Valyu, Perplexity |
| **Academic databases** (12 tools) | PubMed, ArXiv, Semantic Scholar, bioRxiv, Europe PMC, OpenAlex, UniProt, ClinicalTrials.gov, ChEMBL, Wolfram Alpha |
| **2,100+ scientific tools** (ToolUniverse) | Protein structure (AlphaFold, PDB), genomics (Ensembl, ClinVar), chemistry (PubChem, DrugBank), pathways (KEGG, Reactome), drug safety (OpenFDA), and 21 more categories |
| **35 domain skills** | Literature review, experimental design, drug discovery workflow, protein engineering, single-cell RNA QC, statistical analysis, scientific writing, and more |
| **File operations** (11 tools) | Create/read/search files, full-text grep, upload attachments, link files to tasks |
| **Memory** (9 tools) | Remember facts across tasks, share findings between agents, recall prior context |
| **Code execution** | Persistent Python REPL with pandas, numpy, biopython. Variables survive across executions. 30s timeout, 1MB output max |

## Good prompts

```bash
# Web research
$CLI --compact tasks create --project "$PROJECT" --title "Web research" \
  --message "Search for recent CRISPR delivery methods and summarize the top findings"

# Literature review
$CLI --compact tasks send "$TASK" \
  --message "Search PubMed for BRCA1 DNA repair papers from 2024, find the most cited ones"

# Drug target research
$CLI --compact tasks send "$TASK" \
  --message "Search for compounds targeting EGFR, cross-reference with active clinical trials"

# Scientific computation
$CLI --compact tasks send "$TASK" \
  --message "Use ToolUniverse to run AlphaFold on this sequence: MVLSPADKTNVKAAWGKVGA"

# Memory
$CLI --compact tasks send "$TASK" \
  --message "Remember that our lab uses Q5 polymerase for all high-fidelity PCR at 62C"

# File search
$CLI --compact tasks send "$TASK" \
  --message "Search all project files for mentions of 'annealing temperature' and summarize"

# Reference existing files
$CLI --compact tasks send "$TASK" \
  --message "Read the attached template and generate a new version" --file-refs "<FILE_ID>"
```

## Full tool reference

Detailed tool-by-tool documentation is in the vault at `04-engineering/elnora-agent-*-tools.md`.
