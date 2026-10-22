#!/usr/bin/env node
// Developer tool: fetches recipe wikitext (Wikibooks Cookbook, CC BY-SA 4.0) and the matching
// Wikimedia Commons photo + its licence metadata. NOT run by the Vercel build; output is committed.
// Usage: node scripts/fetch-content.mjs [--force]
// Etiquette: serial requests, ~1 per second, identifying User-Agent, Retry-After respected on 429.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const run = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const UA = 'CulinaryCompanionContentFetch/1.0 (https://github.com/akib-arifeen/Culnary-Companion)'
// ffmpeg here has no libwebp encoder, so cwebp (Homebrew `webp` package) does the conversion.
const CWEBP = '/opt/homebrew/bin/cwebp'
const WEBPINFO = '/opt/homebrew/bin/webpinfo'
const force = process.argv.includes('--force')

/** Hard-coded selection. `page` is the Wikibooks title WITHOUT the "Cookbook:" prefix. */
const RECIPES = [
  { slug: 'red-lentil-soup', page: 'Red Lentil Soup', photoFile: 'Lentil soup in a bowl.jpg' },
  { slug: 'naan', page: 'Naan', photoFile: 'Naan shiva.jpg' },
  { slug: 'north-american-pancakes', page: 'Pancakes (North American)', photoFile: 'Banana on pancake.jpg' },
  { slug: 'paprika-chicken', page: 'Paprika Chicken', photoFile: 'Paprikás Csirke Galuskával.jpg' },
  { slug: 'acorn-crusted-salmon', page: 'Acorn Crusted Salmon', photoFile: 'Acorn crust salmon.jpg' },
  { slug: 'chocolate-chip-cookies', page: 'Chocolate Chip Cookies I', photoFile: 'Chocolate chip cookies.jpg' },
  { slug: 'basic-omelet', page: 'Basic Omelet', photoFile: 'Omelet With Fixings.jpg' },
  { slug: 'spaghetti-aglio-e-olio', page: 'Spaghetti Aglio e Olio', photoFile: 'Spaghetti aglio olio e peperoncino by matsuyuki retouched.jpg' },
]

const ACCEPTED = [/^cc0/i, /^public domain/i, /^pd\b/i, /^cc[ -]by(-sa)?\b/i]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const exists = (p) => access(p).then(() => true, () => false)
const plain = (html = '') =>
  html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

let last = 0
async function get(url, { binary = false } = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = 1100 - (Date.now() - last)
    if (wait > 0) await sleep(wait)
    last = Date.now()
    let res
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA } })
    } catch (err) {
      console.log(`  network error (${err.cause?.code ?? err.message}), retrying`)
      await sleep(5000)
      continue
    }
    if (res.status === 429 || res.status >= 500) {
      const ra = Number(res.headers.get('retry-after')) || 5 * (attempt + 1)
      console.log(`  ${res.status} from server, waiting ${ra}s`)
      await sleep(ra * 1000)
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`)
    return binary ? Buffer.from(await res.arrayBuffer()) : res.text()
  }
  throw new Error(`gave up on ${url}`)
}
const api = async (host, params) =>
  JSON.parse(await get(`https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`))

await mkdir(path.join(root, 'content/sources'), { recursive: true })
await mkdir(path.join(root, 'public/recipes'), { recursive: true })

for (const { slug, page, photoFile } of RECIPES) {
  const wt = path.join(root, 'content/sources', `${slug}.wikitext`)
  const meta = path.join(root, 'content/sources', `${slug}.meta.json`)
  const webp = path.join(root, 'public/recipes', `${slug}.webp`)
  const have = (await exists(wt)) && (await exists(meta)) && (await exists(webp))
  if (have && !force) {
    console.log(`skipped existing files for ${slug} (use --force to re-fetch)`)
    continue
  }
  console.log(`fetching ${slug}`)
  const title = `Cookbook:${page}`

  // Revision first, then raw text of that exact revision so text and revision id agree.
  const rev = (await api('en.wikibooks.org', { action: 'query', prop: 'revisions', titles: title, rvprop: 'ids|timestamp' })).query.pages[0].revisions[0]
  const text = await get(`https://en.wikibooks.org/w/index.php?${new URLSearchParams({ oldid: String(rev.revid), action: 'raw' })}`)
  await writeFile(wt, text)

  const fileTitle = `File:${photoFile}`
  const info = (await api('commons.wikimedia.org', {
    action: 'query', prop: 'imageinfo', titles: fileTitle, iiprop: 'url|extmetadata|size', iiurlwidth: '1200',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|AttributionRequired|UsageTerms',
  })).query.pages[0].imageinfo[0]
  const x = info.extmetadata
  const license = plain(x.LicenseShortName?.value)
  if (!ACCEPTED.some((re) => re.test(license))) throw new Error(`${slug}: photo licence "${license}" is not accepted`)
  const author = plain(x.Artist?.value)
  if (!author) throw new Error(`${slug}: no author on Commons file page`)

  const bytes = await get(info.thumburl, { binary: true })
  const tmp = path.join(root, 'content/sources', `${slug}.download`)
  await writeFile(tmp, bytes)
  // Commons sometimes serves the original (a little over 1200 px) as the "thumbnail": encode once, then shrink only if too wide. Never upscale.
  const encode = (extra) => run('nice', ['-n', '10', CWEBP, '-quiet', '-q', '75', ...extra, tmp, '-o', webp])
  const size = async () => {
    const wi = (await run(WEBPINFO, [webp], { encoding: 'utf8' })).stdout
    return [Number(/Width: (\d+)/.exec(wi)?.[1]), Number(/Height: (\d+)/.exec(wi)?.[1])]
  }
  await encode([])
  if ((await size())[0] > 1200) await encode(['-resize', '1200', '0'])
  await run('rm', ['-f', tmp])
  const [width, height] = await size()
  if (!width || !height) throw new Error(`${slug}: could not read webp size`)

  await writeFile(meta, JSON.stringify({
    page: title,
    url: `https://en.wikibooks.org/wiki/${title.replaceAll(' ', '_')}`,
    revisionId: rev.revid,
    revisionUrl: `https://en.wikibooks.org/w/index.php?oldid=${rev.revid}`,
    revisionTimestamp: rev.timestamp,
    retrieved: new Date().toISOString().slice(0, 10),
    photo: {
      file: photoFile, filePage: info.descriptionurl, author, license,
      licenseUrl: plain(x.LicenseUrl?.value) || undefined,
      width, height, thumbUrl: info.thumburl,
    },
  }, null, 2) + '\n')
}
console.log('done')
