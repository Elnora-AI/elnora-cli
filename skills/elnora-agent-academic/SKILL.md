---
name: elnora-agent-academic
description: >
  This skill should be used when the user asks about "PubMed search", "ArXiv papers",
  "Semantic Scholar", "Wikipedia", "bioRxiv", "medRxiv", "Europe PMC", "OpenAlex",
  "CrossRef", "DOI lookup", "UniProt", "protein search", "clinical trials",
  "ClinicalTrials.gov", "ChEMBL", "drug targets", "Wolfram Alpha",
  "literature search", "citation graph", "biomedical papers",
  or any task involving the Elnora Agent's academic and scientific database tools.
---

# Elnora Agent — Academic & Scientific Tools (12)

> **REFERENCE ONLY — not callable from the CLI.** These are the agent's internal tools. You cannot run them directly. Instead, describe what you need in a `tasks send` message and the agent will pick the right tool. This skill exists so you know what the agent is capable of.

Free direct API access to biomedical and scientific databases.

```bash
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
$CLI --compact tasks send <TASK_ID> --message "Your research request here"
```

## Tools

| Tool | Purpose | Source | When to ask for it |
|------|---------|--------|--------------------|
| `pubmed_search` | 36M+ biomedical abstracts | NCBI/PubMed | Biomedical literature, clinical research |
| `arxiv_search` | Preprints (physics, CS, bio) | ArXiv | Pre-publication papers, ML/AI research |
| `semantic_scholar_search` | Papers with citation graphs | Semantic Scholar | Citation analysis, influential papers |
| `wikipedia_search` | Encyclopedia articles | Wikipedia | Background knowledge, definitions |
| `biorxiv_search` | bioRxiv/medRxiv preprints | Europe PMC | Pre-publication biology/medicine |
| `europe_pmc_search` | Full-text biomedical search | Europe PMC | Open-access full-text papers |
| `openalex_search` | 250M+ works with concept tagging | OpenAlex | Broad scholarly search, concept mapping |
| `crossref_lookup` | DOI resolution and metadata | CrossRef | Resolve DOIs, get citation metadata |
| `uniprot_search` | Protein database + sequences | UniProt | Protein info, sequences, annotations |
| `clinical_trials_search` | Clinical trial data | ClinicalTrials.gov | Active/completed trials, drug studies |
| `chembl_search` | Drug-target bioactivity data | ChEMBL | Drug discovery, compound activity |
| `wolfram_alpha_query` | Computational knowledge | Wolfram Alpha | Math, chemistry, physics calculations |

## Choosing the Right Database

| Scenario | Best tool |
|----------|-----------|
| Published biomedical research | `pubmed_search` |
| Pre-prints (biology) | `biorxiv_search` |
| Pre-prints (physics, CS, ML) | `arxiv_search` |
| Citation analysis, impact | `semantic_scholar_search` |
| Full-text open-access search | `europe_pmc_search` |
| Broad scholarly search across disciplines | `openalex_search` |
| Resolve a DOI to metadata | `crossref_lookup` |
| Protein sequences and annotations | `uniprot_search` |
| Find clinical trials for a drug/condition | `clinical_trials_search` |
| Drug-target binding data | `chembl_search` |
| Compute a formula or convert units | `wolfram_alpha_query` |
| Quick background on a concept | `wikipedia_search` |

## Agent Recipes

**Literature review:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Search PubMed for BRCA1 DNA repair papers from 2023-2024, then use Semantic Scholar to find the most cited ones"
```

**Drug target research:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Search ChEMBL for compounds targeting EGFR, then cross-reference with ClinicalTrials.gov for active trials"
```

**Protein analysis:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Look up TP53 in UniProt and summarize its domains and known mutations"
```
