---
title: "Lorem Ipsum Talk: AI Security Without Magic"
date: 2026-05-12
draft: false
deck: "A placeholder conference page for testing slide metadata, abstract formatting, PDF links, and event-style list cards."
image: "/images/thumbs/ai-security-talk.svg"
event: "future conference / workshop"
location: "TBD"
tags: ["ai-security", "slides", "conference"]
pdf: "/slides/ai-security-without-magic.pdf"
---

Upload the PDF to `static/slides/ai-security-without-magic.pdf`, then keep this page as the public landing page for the deck.

## Abstract

Lorem ipsum dolor sit amet, consectetur adipiscing elit. In the real talk, AI security should be framed as engineering discipline: threat modeling, data exposure, prompt injection, agent behavior, access boundaries, monitoring, and evaluation gaps.

## Outline

1. What changed with model-facing systems.
2. What did not change in security practice.
3. Prompt injection as a boundary failure.
4. Agents, tools, memory, and blast radius.
5. Practical mitigations and open questions.

```text
slide-rail: 0x464c4b | RkxL | flouksac
format: PDF
status: placeholder
```

{{< terminal title="export convention" >}}
mkdir -p static/slides
cp ~/talks/ai-security-without-magic.pdf static/slides/
hugo server -D
{{< /terminal >}}
