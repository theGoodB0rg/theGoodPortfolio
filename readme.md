# Portfolio — Olorunfemi John

**Full-stack developer & technical architect.** I design and build web platforms, AI-powered tools, and Android apps that people actually use.

→ [thegoodb0rg.pages.dev](https://thegoodb0rg.pages.dev)

---

## Overview

This is my personal portfolio — a single-page site that showcases who I am, what I've built, and how I work. It's designed to communicate capability clearly to both technical and non-technical audiences: hiring managers, potential clients, and fellow developers.

### What's inside

- **Hero** — Tagline, personality-driven heading, and photo
- **Featured project** — Best work front and center
- **Philosophy strip** — A quote that says what the resume can't
- **About** — Background and tech stack
- **Education & Experience** — Academic credentials and professional roles, framed around architecture and strategy
- **Portfolio** — Filterable project grid (Web / Android)
- **Services** — What I can build for you
- **Blog** — Deep dives and dev notes
- **Contact** — Email, LinkedIn, GitHub, resume download

## Tech stack

| Layer | Choice |
|---|---|
| Bundler | [Vite 6](https://vitejs.dev/) |
| Language | Vanilla JS (ES modules) |
| Styling | Hand-rolled CSS with custom properties |
| Fonts | Outfit (display), Inter (body), JetBrains Mono (code) |
| Deployment | [Cloudflare Pages](https://pages.cloudflare.com/) |
| OG image | Generated at build time with [sharp](https://sharp.pixelplumbing.com/) |

## Getting started

```bash
git clone https://github.com/theGoodB0rg/theGoodPortfolio.git
cd theGoodPortfolio
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Hot reload is on — edit and see changes instantly.

### Build for production

```bash
npm run build
```

Generates the OG preview image, then bundles everything into `dist/`. Deploy the contents of `dist/` to any static host.

## Structure

```
├── index.html            # Homepage
├── blog.html             # Blog listing
├── blog-post.html        # Individual blog post
├── src/
│   ├── style.css         # All styles (single stylesheet)
│   ├── main.js           # Homepage logic
│   ├── blog.js           # Blog logic (index + post pages)
│   └── mobile-menu.js    # Navigation menu
├── public/
│   ├── profile.png       # Avatar (About section)
│   ├── john_glasses_casual.png/.webp  # Hero photo
│   ├── og-image.png      # Social preview card
│   ├── data/             # JSON files (projects, blog posts)
│   ├── projects/         # Project screenshots
│   └── blog/             # Blog thumbnails
├── scripts/
│   └── generate-og-image.js  # OG image generator
└── wrangler.jsonc        # Cloudflare Pages config
```

## Social preview

When the portfolio is shared on Twitter/X, LinkedIn, Facebook, or Discord, a 1200×630 preview card is displayed — generated programmatically at build time. Blog post pages update their OG tags dynamically with the post title, excerpt, and thumbnail.

## License

This is a personal portfolio. Feel free to reference the code, but the content, design, and personal branding are my own.
