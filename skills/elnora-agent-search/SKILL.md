---
name: elnora-agent-search
description: >
  This skill should be used when the user asks about "web search", "Tavily search",
  "Exa search", "Valyu search", "Perplexity search", "neural search", "crawl website",
  "extract URL", "find similar pages", "deep research", "real-time search",
  "financial search", "patent search", "SEC filings", "company search",
  "academic search via Valyu", "batch search",
  or any task involving the Elnora Agent's web search capabilities.
---

# Elnora Agent — Web Search Tools (34)

The agent has four web search providers. Ask the agent to use the right one for your task via `tasks send`.

```bash
CLI="uv run --project ${CLAUDE_PLUGIN_ROOT} elnora"
$CLI --compact tasks send <TASK_ID> --message "Your search request here"
```

## Tavily (6 tools)

General-purpose real-time web search and content extraction.

| Tool | Purpose | When to ask for it |
|------|---------|--------------------|
| `tavily_search` | Real-time web search | General web queries, current events |
| `tavily_context` | Get web context for a topic | Background research on a topic |
| `tavily_extract` | Extract clean content from URLs | Pull text from a specific webpage |
| `tavily_crawl` | Crawl website structure | Map out a website's pages |
| `tavily_map` | Generate topic mindmap with related searches | Explore a broad topic |
| `tavily_research` | Extended research mode | Deep-dive into a complex topic |

## Exa (8 tools)

Neural/semantic search — best for finding conceptually similar content and code.

| Tool | Purpose | When to ask for it |
|------|---------|--------------------|
| `exa_search` | Neural search over web | Semantic similarity, meaning-based search |
| `exa_find_similar` | Find similar pages to a URL | "Find pages like this one" |
| `exa_get_contents` | Extract full content from results | Get full text from Exa search results |
| `exa_answer` | Answer-focused neural search | Direct answer extraction |
| `exa_code_search` | Search code repositories | Find code examples, implementations |
| `exa_research_create` | Create async research task | Long-running background research |
| `exa_research_status` | Check async research status | Poll for research completion |
| `exa_research_list` | List ongoing research tasks | See all active research |

## Valyu (16 tools)

Multi-source domain-specific search — financial, academic, patent, regulatory.

| Tool | Purpose | When to ask for it |
|------|---------|--------------------|
| `valyu_search` | Unified multi-source search | Broad search across all Valyu sources |
| `valyu_deep_research` | Deep-dive research with recommendations | Complex multi-faceted research |
| `valyu_extract` | Extract content from specific URL | Pull content from a known URL |
| `valyu_answer` | Answer extraction from research | Direct answers from research |
| `valyu_datasources` | List available data sources | See what Valyu can search |
| `valyu_cancel_research` | Cancel async research | Stop a running research task |
| `valyu_list_research` | List async research tasks | See all active research |
| `valyu_update_research` | Update research instructions | Modify a running research task |
| `valyu_academic` | Academic papers focused search | Scholarly articles and papers |
| `valyu_bio` | Biomedical literature focused search | Biomedical and life science papers |
| `valyu_financial` | Financial/SEC documents focused | Financial reports, earnings |
| `valyu_sec` | SEC filing/regulatory focused | 10-K, 10-Q, 8-K filings |
| `valyu_patents` | Patent database focused | Patent search and analysis |
| `valyu_economics` | Economic data focused | Economic indicators, statistics |
| `valyu_company` | Company information focused | Company profiles, data |
| `valyu_batch` | Batch search multiple queries | Run many searches at once |

## Perplexity (4 tools)

Search with reasoning and citations — best for Q&A with sourced answers.

| Tool | Purpose | When to ask for it |
|------|---------|--------------------|
| `perplexity_search` | Real-time web search with citations | Factual queries needing sources |
| `perplexity_ask` | Interactive Q&A with sources | Questions requiring cited answers |
| `perplexity_reason` | Extended reasoning mode | Complex questions needing analysis |
| `perplexity_research` | Focused research mode | In-depth sourced research |

## Choosing the Right Provider

| Scenario | Best provider |
|----------|--------------|
| General web search, current events | Tavily |
| Find conceptually similar content | Exa |
| Code search | Exa (`exa_code_search`) |
| Academic papers | Valyu (`valyu_academic`) or Valyu (`valyu_bio`) |
| Financial data, SEC filings | Valyu (`valyu_financial`, `valyu_sec`) |
| Patents | Valyu (`valyu_patents`) |
| Q&A with citations | Perplexity |
| Complex reasoning from web sources | Perplexity (`perplexity_reason`) |
| Extract content from a known URL | Tavily (`tavily_extract`) or Valyu (`valyu_extract`) |
| Long-running background research | Exa (`exa_research_create`) or Valyu (`valyu_deep_research`) |

## Agent Recipes

**Compare search providers for a topic:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Search for 'CRISPR base editing efficiency' using both Tavily and Exa, compare the results"
```

**Financial research:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Use Valyu to find recent SEC filings for Moderna, then summarize their R&D pipeline"
```

**Code search:**

```bash
$CLI --compact tasks send "$TASK" \
  --message "Use Exa code search to find Python implementations of Smith-Waterman alignment"
```
