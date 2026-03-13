# Serverless Anubis

**Serverless Proof-of-Work (PoW) protection** for static websites on **Cloudflare Pages**, fan project of [Anubis](https://github.com/TecharoHQ/anubis). 

It is **not intended to defeat highly resourced or targeted scraping operations**.

## Features
- Auto-solve on page load
- Domain badge
- Fixed cookie base64 padding bug
- Fixed XSS vulnerabilities
- Overall improvements

## Setup
1. Add the [`_middleware.ts`](https://raw.githubusercontent.com/AnakamaTH/Anubis-Serverless/refs/heads/main/functions/_middleware.ts) file to your project's `functions` folder.
2. Change `SECRET_KEY` in `_middleware.ts`  
3. Optionally add Images: Change the image links in the URLs section in `_middleware.ts`
4. Optionally add a favicon to `/favicon.png`
   
## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `DIFFICULTY` | PoW difficulty (higher = more CPU cost). Recommended: 3–6 | `3` |
| `SECRET_KEY` | HMAC signing key. **Must be changed before deployment** | — |
| `BOT_AGENTS` | List of user agent substrings to whitelist (SEO bots) | Google, Bing, Yahoo, DuckDuckBot, DiscordBot |
| `CHALLENGE_TTL` | How long a challenge is valid (milliseconds) | `300000` (5 min) |

> If you want to disable automatic verification and want the user to manually click the button, replace `document.addEventListener('DOMContentLoaded', mine);` with `btn.addEventListener('click', mine);`

---

## License
- MIT (Based on [Anubis](https://github.com/TecharoHQ/anubis) by TecharoHQ)
- Improved fork of [Albireo](https://github.com/51511/Albireo).
