interface Env {
  ASSETS: Fetcher;
}

// Configuration
const DIFFICULTY = 3;
const SECRET_KEY = "YOUR_KEY_HERE";
const BOT_AGENTS = ["google", "bingbot", "yahoo", "duckduckbot"];
const CHALLENGE_TTL = 5 * 60 * 1000;

// UI Strings
const STRINGS = {
  title: "Security Check",
  heading: "Security Check",
  description: "Please verify you are human.",
  btn_start: "I am human",
  btn_calculating: "Calculating...",
  btn_verifying: "Verifying...",
  btn_success: "Success!",
  btn_retry: "Retry",
  btn_error: "Error",
};

// Fallback image URLs (used when local /img/anubis/ assets are unavailable)
const IMG_FALLBACK_CHECK   = "https://anubis.techaro.lol/.within.website/x/cmd/anubis/static/img/pensive.webp";
const IMG_FALLBACK_SUCCESS = "https://anubis.techaro.lol/.within.website/x/cmd/anubis/static/img/happy.webp";
const IMG_FALLBACK_FAILED  = "https://anubis.techaro.lol/.within.website/x/cmd/anubis/static/img/reject.webp";

// Crypto Utils
async function sign(msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verify(msg: string, sig: string): Promise<boolean> {
  const expected = await sign(msg);
  return expected === sig;
}

async function checkPoW(challenge: string, nonce: string, response: string, difficulty: number): Promise<boolean> {
  const msg = challenge + String(nonce);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(msg));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const calculated = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  if (calculated !== response) return false;
  const prefix = "0".repeat(difficulty);
  if (!calculated.startsWith(prefix)) return false;
  return true;
}

// Safe Redirect Validator
function safeRedirect(path: string): string {
  try {
    if (path.startsWith('/') && !path.startsWith('//')) return path;
  } catch (_) {}
  return '/';
}

// HTML Generator
const GENERATE_HTML = (challenge: string, originalPath: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<link rel="icon" href="/img/anubis/favicon.png" type="image/png" />
<title>${STRINGS.title}</title>
<link rel="preload" href="https://anubis.techaro.lol/.within.website/x/cmd/anubis/static/img/pensive.webp" as="image" />
<style>
* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0d0d0d; color: #e0e0e0; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; gap: 16px; } .box { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 40px 32px; max-width: 380px; width: 100%; } .mascot { width: 100%; max-width: 256px; height: auto; display: block; } h1 { font-size: 1.25rem; font-weight: bold; color: #ffffff; text-align: center; } p { font-size: 0.85rem; color: #888; text-align: center; max-width: 300px; line-height: 1.6; } button { background: #1a0000; color: #e0e0e0; border: 1px solid #8b0000; padding: 11px 32px; border-radius: 4px; font-family: monospace; font-size: 0.9rem; cursor: pointer; width: 100%; } button:hover:not(:disabled) { background: #8b0000; color: #ffffff; } button:disabled { opacity: 0.5; cursor: default; } footer { position: fixed; bottom: 16px; font-size: 0.75rem; color: #444; } footer a { color: #444; }
</style>
</head>
<body>
<div class="box">
<img src="/img/anubis/pensive.webp" class="mascot" id="mascot-img" alt="Guard"
  onerror="this.onerror=null; this.src='${IMG_FALLBACK_CHECK}';">
<h1>${STRINGS.heading}</h1>
<p>${STRINGS.description}</p>
<button id="verify-btn">${STRINGS.btn_start}</button>
</div>
<script>
const CHALLENGE = "${challenge}";
const DIFFICULTY = ${DIFFICULTY};
const ORIGINAL_PATH = "${originalPath}";
const IMG_CHECK   = "/img/anubis/pensive.webp";
const IMG_SUCCESS = "/img/anubis/happy.webp";
const IMG_FAILED  = "/img/anubis/reject.webp";
const FALLBACKS = {
  check:   "${IMG_FALLBACK_CHECK}",
  success: "${IMG_FALLBACK_SUCCESS}",
  failed:  "${IMG_FALLBACK_FAILED}",
};
const S = {
  calculating: ${JSON.stringify(STRINGS.btn_calculating)},
  verifying:   ${JSON.stringify(STRINGS.btn_verifying)},
  success:     ${JSON.stringify(STRINGS.btn_success)},
  retry:       ${JSON.stringify(STRINGS.btn_retry)},
  error:       ${JSON.stringify(STRINGS.btn_error)},
};
const btn = document.getElementById('verify-btn');
const img = document.getElementById('mascot-img');

function setMascot(imgSrc, fallbackSrc) {
  img.onerror = () => { img.onerror = null; img.src = fallbackSrc; };
  img.src = imgSrc;
}

// Web Worker code (inline via Blob)
const WORKER_CODE = \`
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

self.onmessage = async (e) => {
  const { challenge, difficulty, startNonce, step } = e.data;
  const prefix = "0".repeat(difficulty);
  let nonce = startNonce;
  while (true) {
    const hash = await sha256(challenge + nonce);
    if (hash.startsWith(prefix)) {
      self.postMessage({ found: true, nonce, hash });
      return;
    }
    nonce += step;
  }
};
\`;

function createWorker() {
  const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

function mine() {
  btn.disabled = true; btn.innerText = S.calculating;
  setMascot(IMG_CHECK, FALLBACKS.check);

  const numWorkers = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
  const workers = [];
  let done = false;

  for (let i = 0; i < numWorkers; i++) {
    const worker = createWorker();
    workers.push(worker);
    worker.postMessage({ challenge: CHALLENGE, difficulty: DIFFICULTY, startNonce: i, step: numWorkers });
    worker.onmessage = (e) => {
      if (done) return;
      done = true;
      workers.forEach(w => w.terminate());
      submit(e.data.nonce, e.data.hash);
    };
  }
}

function submit(nonce, response) {
  btn.innerText = S.verifying;
  const fd = new FormData();
  fd.append('nonce', nonce);
  fd.append('response', response);
  fd.append('verify', 'true');
  fd.append('original_path', ORIGINAL_PATH);

  fetch(window.location.href, { method: 'POST', body: fd }).then(async res => {
    if (res.ok) {
      const data = await res.json();
      setMascot(IMG_SUCCESS, FALLBACKS.success);
      btn.innerText = S.success;
      setTimeout(() => { window.location.href = data.redirect; }, 500);
    } else {
      setMascot(IMG_FAILED, FALLBACKS.failed);
      btn.innerText = S.retry; btn.disabled = false;
    }
  }).catch(() => {
    setMascot(IMG_FAILED, FALLBACKS.failed);
    btn.innerText = S.error; btn.disabled = false;
  });
}

btn.addEventListener('click', mine);
</script>
<footer>
<p>Proof-of-Work, modified version of <a href="https://anubis.techaro.lol/">Anubis</a>.</p>
<p>Mascot design by <a href="https://bsky.app/profile/celphase.bsky.social">CELPHASE</a>.
<p>Copyright Anubis © 2026 Techaro.</p>
</footer>
</body>
</html>
`;

export const onRequest: PagesFunction<Env> = async (context) => {
  if (SECRET_KEY === "") {
    return new Response("SECURITY ERROR: Please change SECRET_KEY in _middleware.ts", { status: 500 });
  }

  const { request, next } = context;
  const url = new URL(request.url);
  const ua = (request.headers.get("User-Agent") || "").toLowerCase();

  if (
    url.pathname.match(
      /\.(png|jpg|jpeg|gif|webp|avif|heic|heif|ico|svg|bmp|tiff|tif|css|js|mjs|jsx|ts|tsx|map|json|xml|rss|atom|txt|pdf|csv|yaml|yml|toml|woff|woff2|ttf|otf|eot|mp4|webm|ogv|mov|avi|mkv|m4v|mp3|wav|ogg|flac|aac|m4a|opus|zip|tar|gz|7z|wasm|md|markdown|htaccess|webmanifest)$/i
    )
  ) {
    return next();
  }

  // 2. Pass SEO bots
  if (BOT_AGENTS.some(b => ua.includes(b))) return next();

  // 3. Check Cookie
  const cookie = request.headers.get("Cookie") || "";
  if (cookie.includes("anubis_solved=true")) return next();

  // 4. Handle POST
  if (request.method === "POST") {
    try {
      const fd = await request.formData();
      if (!fd.has('verify')) return new Response("Bad Request", { status: 400 });

      const nonce = fd.get("nonce") as string;
      const response = fd.get("response") as string;
      const originalPath = safeRedirect(fd.get("original_path") as string || "/");

      const cStr = cookie.split(';').find(c => c.trim().startsWith('anubis_challenge='));
      if (!cStr) return new Response("Expired", { status: 403 });

      const [challenge, timestamp, sig] = decodeURIComponent(cStr.split('=')[1].trim()).split('.');

      if (!await verify(challenge + '.' + timestamp, sig)) return new Response("Invalid Signature", { status: 403 });

      const issuedAt = parseInt(timestamp, 10);
      if (isNaN(issuedAt) || Date.now() - issuedAt > CHALLENGE_TTL) {
        return new Response("Challenge Expired", { status: 403 });
      }

      if (!await checkPoW(challenge, nonce, response, DIFFICULTY)) return new Response("POW Failed", { status: 403 });

      const headers = new Headers();
      headers.append("Set-Cookie", "anubis_solved=true; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400");
      headers.set("Content-Type", "application/json");

      return new Response(JSON.stringify({ success: true, redirect: originalPath }), { status: 200, headers });
    } catch (e) {
      return new Response("Server Error", { status: 500 });
    }
  }

  // 5. Issue Challenge
  const rnd = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Date.now().toString();
  const payload = rnd + '.' + timestamp;
  const sig = await sign(payload);
  const originalPath = safeRedirect(url.pathname + url.search + url.hash);

  const headers = new Headers();
  headers.set("Content-Type", "text/html");
  headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
  headers.set("Set-Cookie", `anubis_challenge=${encodeURIComponent(payload + '.' + sig)}; Path=/; HttpOnly; Secure; SameSite=Lax`);

  return new Response(GENERATE_HTML(rnd, originalPath), { headers });
};