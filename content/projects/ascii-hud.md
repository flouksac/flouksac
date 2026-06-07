---
title: "Lorem Ipsum Project: ASCII HUD Experiments"
date: 2026-05-27
draft: false
deck: "A placeholder project page for terminal-first interface experiments, geometric overlays, ASCII blocks, and readable cyberpunk UI patterns."
image: "/images/thumbs/ascii-hud.svg"
tags: ["ui", "ascii", "cyberpunk"]
project_url: "https://github.com/flouksac/ascii-hud"
---

Lorem ipsum dolor sit amet, consectetur adipiscing elit. This project page is a placeholder for visual experiments.


```css
.hud-node {
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px));
  border: 1px solid var(--secondary);
}
```

{{< terminal title="project scaffold" >}}
mkdir ascii-hud
cd ascii-hud
git init
printf "FLK // 0x464c4b\n" > README.md
{{< /terminal >}}

