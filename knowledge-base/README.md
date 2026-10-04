# Knowledge base (sample content)

Markdown files the chatbot answers from. Amber & Pea Law is fictional; everything here is sample content.

Each file starts with front matter:

```
---
title: Page title shown in citations
url: /site/path/the/citation/links/to
---
```

Content is split into chunks at `##` and `###` headings, so keep one topic per section.
This README is not indexed.

Re-index after editing (from the repo root), then restart the AI service:

```powershell
ai-service\.venv\Scripts\python knowledge-base\ingest.py
```
