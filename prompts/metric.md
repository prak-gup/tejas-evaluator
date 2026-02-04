# Metric Comparison: Word Count vs. Sentence Count

This document outlines the transition from strict word-count-based metrics to sentence-based metrics for better LLM adherence.

**Conversion Logic:** 1 Sentence ≈ 15 Words.

---

## 🔴 1. Previous Matrix (Word Count)

The original structure relied on specific word counts for each section.

| Category | Total Words | Headline (Words) | Intro (Words) | Body (Words) | Subheadings | Words/Subheading |
|----------|-------------|------------------|---------------|--------------|-------------|------------------|
| **A (Flash)** | 0-100 | 5-8 | 25 | 75 | 0 | - |
| **B (Brief)** | 100-150 | 8-10 | 25 | 125 | 0 | - |
| **C (Standard)**| 151-250 | 8-10 | 40 | 130 | 1 | 70 |
| **D (Standard+)**| 251-350 | 10-12 | 50 | 150 | 2 | 70 |
| **E (Detailed)**| 351-500 | 12-15 | 60 | 160 | 3 | 90 |
| **F (Depth)** | 501-650 | 12-15 | 60 | 180 | 3 | 97 |
| **G (Coverage)**| 651-800 | 15-18 | 60 | 230 | 4 | 125 |
| **H (Analysis)**| 801-1000 | 15-18 | 70 | 300 | 4 | 150 |
| **I (Feature)** | 1000+ | 15-18 | 80 | 600 | 5 | 160 |

---

## 🟢 2. New Matrix (Sentence Count)

The new structure targets sentence counts to allow for more natural language flow while maintaining length constraints.

| Category | Total Sentences (Approx) | Headline (Words) | Intro (Sentences) | Body (Sentences Total) | Subheadings | Sentences/Subheading |
|----------|--------------------------|------------------|-------------------|------------------------|-------------|----------------------|
| **A (Flash)** | ~7 | 5-8 | 1-2 | 5 | 0 | - |
| **B (Brief)** | ~10 | 8-10 | 1-2 | 8 | 0 | - |
| **C (Standard)**| ~15 | 8-10 | 2-3 | 8-9 | 1 | ~5 |
| **D (Standard+)**| ~23 | 10-12 | 3-4 | 10 | 2 | ~5 |
| **E (Detailed)**| ~33 | 12-15 | 4 | 11 | 3 | ~6 |
| **F (Depth)** | ~43 | 12-15 | 4 | 12 | 3 | ~6-7 |
| **G (Coverage)**| ~53 | 15-18 | 4 | 15 | 4 | ~8 |
| **H (Analysis)**| ~66 | 15-18 | 4-5 | 20 | 4 | ~10 |
| **I (Feature)** | ~80+ | 15-18 | 5-6 | 40 | 5 | ~10-11 |

**Note:**
- **Headline**: Kept in words as it is a strict short constraint.
- **Intro/Body**: Converted to sentences (Word Count / 15).
- **Tolerance**: LLMs are better at "write 5 sentences" than "write 75 words".
