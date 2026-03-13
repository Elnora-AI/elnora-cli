---
name: elnora-agent-discovery
description: >
  This skill should be used when the user asks about "ToolUniverse", "scientific tools",
  "find a tool", "agent catalog", "agent skills", "what tools does the agent have",
  "biomedical tools", "protein tools", "genomics tools", "drug discovery tools",
  "AlphaFold", "RDKit", "scanpy", "biopython", "methodology",
  "experimental design", "literature review methodology", "statistical analysis",
  "agent skill list", "2100 tools",
  or any task involving the Elnora Agent's tool discovery, skill system, or ToolUniverse.
---

# Elnora Agent — Discovery & ToolUniverse (10 + 2,100 tools)

The agent has a two-tier discovery system: a catalog/skill layer for guidance, and ToolUniverse for 2,100+ executable scientific tools.

```bash
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
$CLI --compact tasks send <TASK_ID> --message "Your request here"
```

## Catalog Discovery (2 tools)

Two-stage resource loading: compact search first, then full docs on demand.

| Tool | Purpose | When the agent uses it |
|------|---------|------------------------|
| `search_catalog` | Search available tools/databases by keyword | Agent needs to find what's available |
| `load_resource` | Load full markdown docs for a resource | Agent needs detailed usage instructions |

Backed by 74 reference files covering: tools, databases, filesystem, domains, ToolUniverse.

## Skill Discovery (3 tools)

Domain-specific methodology guidance — how to approach a scientific task.

| Tool | Purpose | When the agent uses it |
|------|---------|------------------------|
| `search_skills` | Keyword search over skill names/descriptions | Agent looks for relevant methodology |
| `load_skill` | Load full skill content | Agent needs step-by-step guidance |
| `load_skill_reference` | Deep-dive reference docs for a skill | Agent needs detailed domain knowledge |

### Available Skills (36)

**Tool Skills (20):** scanpy, rdkit, biopython, pysam, kegg-database, reactome-database, uniprot-database, chembl-tools, pubchem-tools, alphafold, alphafold-server, tavily-search, exa-search, valyu-search, perplexity-search, protocols-io, benchling-patterns, clinical-trials-analysis, mass-spectrometry, pydeseq2

**Domain Skills (15):** hypothesis-generation, literature-review-methodology, experimental-design, statistical-analysis, research-problem-selection, drug-discovery-workflow, protein-engineering, single-cell-rna-qc, multi-omics-integration, scvi-tools, nextflow-development, scientific-writing, clinical-trial-protocol, fhir-development, allotrope-conversion

## ToolUniverse Meta-Tools (5 tools)

Gateway to 2,100+ scientific tools across 24 biomedical categories.

| Tool | Purpose | When the agent uses it |
|------|---------|------------------------|
| `tu_list_categories` | List loaded categories + tool counts | See what's available by domain |
| `tu_grep_tools` | Regex search over tool names/descriptions | Find tools by keyword pattern |
| `tu_get_tool_info` | Full schema + usage for a specific tool | Get detailed tool documentation |
| `tu_execute_tool` | Execute any ToolUniverse tool | Run a discovered tool |
| `tu_find_tools` | Semantic LLM-based tool discovery | Natural language tool search |

### ToolUniverse Categories (24)

uniprot, alphafold, ChEMBL, pubchem, ensembl, clinvar, reactome, kegg, pubmed, clinical_trials, openfda, and 13 more.

## Agent Recipes

**Ask the agent to discover tools for a task:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "What tools do you have for protein structure prediction? Search ToolUniverse."
```

**Ask the agent to use a domain methodology:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "I want to do a single-cell RNA-seq QC analysis. Load the relevant skill and guide me."
```

**Ask the agent to find and run a ToolUniverse tool:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Find a tool in ToolUniverse for BLAST sequence alignment and run it with this sequence: MVLSPADKTNVKAAWGKVGA"
```
