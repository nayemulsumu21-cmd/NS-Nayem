# Asset & Image Replacement Guide — NAYEMUL ISLAM Portfolio

All visual assets are organized in `public/images/` so you can replace any demo placeholder with your real photographs and design work in seconds.

## 1. Personal Portraits (`public/images/profile/`)

Drop your portrait files into `public/images/profile/` using these exact filenames:

- **`public/images/profile/hero-portrait.png`** (or `.jpg` / `.webp`)
  - Recommended aspect ratio: `4:5` portrait (e.g., `1200 × 1500 px` or `1600 × 2000 px`).
  - Transparent PNG or studio dark/neutral background works best.
- **`public/images/profile/about-portrait.png`** (or `.jpg` / `.webp`)
  - Recommended aspect ratio: `4:5` portrait (e.g., `1200 × 1500 px`).

> **Tip:** Until those files are added, the website displays a clearly labeled studio portrait frame with a **"Preview With Your Photo"** button so you can test your portrait live in the browser immediately.

## 2. Portfolio Categories (`public/images/portfolio/`)

Each category has its own dedicated folder. Never mix categories—keep every file in its matching folder:

- **Logo Design:** `public/images/portfolio/logos/`
- **Brand Style Guide:** `public/images/portfolio/brand-guidelines/`
- **Social Media Design:** `public/images/portfolio/social-media/`

## 3. Featured Works (`public/images/featured/`)

- Place wide showcase covers (`16:10` or `16:9`, e.g., `1920 × 1200 px`) in `public/images/featured/`.

## 4. Updating Project Metadata & Contact Links

- **Projects Data:** Edit `src/data/projects.ts` to update project titles, descriptions, image paths, display order, or `featured: true/false`.
- **Personal Info & Social Links:** Edit `src/config/site.ts` to update your email address and Behance, Instagram, Facebook, LinkedIn, and Fiverr URLs.
