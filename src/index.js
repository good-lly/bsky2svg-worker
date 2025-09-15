import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('*', cors({ origin: '*', allowMethods: ['GET'], maxAge: 86400 }));

// ---------- helpers --------------------------------------------------------
async function toDataURL(url) {
  const r = await fetch(url); // fetch → ArrayBuffer
  const ct = r.headers.get('content-type') || 'image/jpeg';
  const buf = new Uint8Array(await r.arrayBuffer()); //
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin); // global in Workers
  return `data:${ct};base64,${b64}`;
}
function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function wrapLines(str, max = 40) {
  // naïve word-wrap
  const out = [];
  let line = '';
  for (const w of str.split(/\s+/)) {
    if ((line + w).length > max) {
      out.push(line.trim());
      line = '';
    }
    line += `${w} `;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

const BSKY_API = 'https://public.api.bsky.app';
const USERNAME = 'jolly-good.bsky.social';
const repoUrl = 'https://github.com/good-lly/bsky2svg-worker';

app.get('/health', c => c.text('OK'));

// ---------- main route -----------------------------------------------------
app.get('/render.svg', async c => {
  const actor = USERNAME; // hard-wired for demo
  const [profile, feed] = await Promise.all([
    fetch(`${BSKY_API}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`).then(r => r.json()), // ← returns a promise for the parsed JSON
    fetch(`${BSKY_API}/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=6`).then(r =>
      r.json(),
    ),
  ]);

  // after we have profile, we can now launch the two image fetches in parallel
  const [banner, avatar] = await Promise.all([toDataURL(profile.banner), toDataURL(profile.avatar)]);
  const posts = feed.feed.map(i => ({
    text: i.post.record.text || '',
    imgUrl: i.post.embed?.images?.[0]?.thumb || null,
  }));

  // ---------- layout constants --------------------------------------------
  const W = 600,
    BANNER_H = 120,
    AVATAR = 80,
    GAP = 24;
  const LINE_H = 18,
    IMG_H = 60,
    POST_GAP = 20;

  // ---------- build dynamic markup ----------------------------------------
  let y = BANNER_H + AVATAR + GAP; // first post top Y
  let markup = '';
  let iter = 0;
  for (const p of posts) {
    const startY = y;
    const lines = wrapLines(p.text, 80); // split into rows
    markup += `<g class="post-block" style="animation-delay:${iter * 0.25}s">`;
    lines.forEach((ln, idx) => {
      markup += `<text class="post" x="${GAP}" y="${startY + LINE_H * (idx + 1) - 4}">${escapeHTML(ln)}</text>`;
    });
    let blockH = lines.length * LINE_H;

    if (p.imgUrl) {
      const imgData = await toDataURL(p.imgUrl); // inline thumb
      markup += `<image href="${imgData}" x="${GAP}" y="${startY + blockH}"
             width="96" height="${IMG_H - 6}" preserveAspectRatio="xMidYMid slice"/>`;
      blockH += IMG_H;
    }
    markup += `</g>`; // Closing the <g> tag
    iter++;
    y += blockH + POST_GAP;
  }

  const footerY = y;
  y += 32; // footer height
  const H = y;

  // ---------- final SVG ----------------------------------------------------
  const profileUrl = `https://bsky.app/profile/${profile.handle}`;
  const svg = ` <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto"
  viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMinYMin meet"> <defs> <clipPath id="circle"><circle cx="${GAP + AVATAR / 2}" cy="${BANNER_H}" r="${AVATAR / 2}"/></clipPath> <style>
.uname {font:600 20px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.handle{font:400 14px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:#555}
.post  {font:14px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.footer{font:12px/1.3  -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif} 
.uname, .handle, .post, .footer { fill:#111 }
@keyframes fadeInUp{0%{opacity:0;transform:translateY(12px)}
  100%{opacity:1;transform:translateY(0)}}
  .post-block{opacity:0;animation:fadeInUp .6s ease-out forwards}
@media (prefers-color-scheme: dark) {
        .uname, .handle, .post, .footer { fill:#eee }
        .footer { fill:#aaa }
        .uname, .handle, .post { fill:#ddd }
        .post { fill:#ccc }
     }
</style> </defs>

  <!-- clickable card -->

  <a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
    <g>
      <image href="${banner}" x="0" y="0" width="${W}" height="${BANNER_H}"
             preserveAspectRatio="xMidYMin slice"/>
      <image href="${avatar}" x="${GAP}" y="${BANNER_H - AVATAR / 2}"
             width="${AVATAR}" height="${AVATAR}" clip-path="url(#circle)"/>
      <text class="uname"  x="${GAP * 1.2 + AVATAR}" y="${BANNER_H + 20}">
        ${escapeHTML(profile.displayName || profile.handle)}
      </text>
      <text class="handle" x="${GAP * 1.2 + AVATAR}" y="${BANNER_H + 40}">
        @${escapeHTML(profile.handle)}
      </text>
      ${markup}
    </g>
  </a>

  <!-- footer credit -->

  <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">
    <text class="footer"
       x="${GAP}" y="${footerY}">
   SVG generated with &#x2764;&#xFE0F; by ${repoUrl}
</text>
  </a>
</svg>`;

  return new Response(svg, {
    headers: {
      // use lower-case so we overwrite Hono’s default
      'content-type': 'image/svg+xml; charset=utf-8',
      // caching is optional but nice
      'cache-control': 'public, max-age=300',
    },
  });
});

function escapeHTML(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default app;
