# Prompting Guide for Code Review & Optimization

**Instructions for LLM (like Perplexity):**
Please act as an Expert Software Architect and Systems Performance Engineer. I am providing you with the current architecture and technical reference for BitScribe DMLS, a Tauri (Rust) and React (Vite) application used for deeply scanning, parsing, and cataloging massive digital media libraries.

The application relies on SQLite for state management and FFprobe for deep media analysis.

Using the provided `BitScribe Technical Reference`, please analyze the current structure and provide recommendations or draft subsequent specific prompts to evaluate:
1. Identifying further O(N^2) or high-memory serialization bottlenecks when passing arrays of objects between Rust (Tauri backend) and TypeScript (frontend/worker).
2. Optimizing the `scanDirectories` orchestration loop in TypeScript, especially around deduplication mapping.
3. Reviewing the database schema and queries: Is `PRAGMA mmap_size` correctly balanced with `cache_size`? Should we add compound indexes given the filter capabilities needed for the frontend Dashboard?

[Include the contents of reference_doc.md here when you paste this into Perplexity.]
