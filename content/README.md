# Recipe content

The recipes in `src/data/recipes.ts` are real recipes with real photos. Nothing in them is invented.

## Where it comes from

- **Recipe text** is adapted from the [Wikibooks Cookbook](https://en.wikibooks.org/wiki/Cookbook:Table_of_Contents)
  and is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  Each recipe stores the page URL, a permanent link to the exact revision adapted (`oldid`), the licence and a
  statement of changes, and the app shows them in the recipe's Credits block.
  Adapted text is shared under the same licence.
- **Changes made:** "Adapted into step-by-step format; wording edited for reading aloud." The ingredient list,
  quantities and every stated time come from the source page. Step timers exist only where a step's text states a duration.
- **Photos** are from [Wikimedia Commons](https://commons.wikimedia.org/). Each file carries its own licence
  (only CC0, public domain, CC BY or CC BY-SA are accepted). The creator, licence, licence link and file page are stored
  with the recipe and shown under the photo. Photos are resized and converted to WebP (max 1200 px wide);
  that conversion is a change to the original file.

## Files

- `content/sources/<slug>.wikitext`: the raw Wikibooks wikitext of the adapted revision.
- `content/sources/<slug>.meta.json`: page, revision id and link, retrieval date and the photo's Commons metadata
  (file, file page, author, licence, licence URL, size).
- `public/recipes/<slug>.webp`: the self-hosted photo.

## Re-fetching

This is a developer tool. The Vercel build does **not** run it; the fetched content is committed.

```sh
node scripts/fetch-content.mjs           # fetches what is missing, skips existing files
node scripts/fetch-content.mjs --force   # re-fetches everything (the revision id may move on)
```

Requires Node 18+ and `cwebp` (`brew install webp`). Requests are made one at a time, about one per second, with an
identifying `User-Agent`, and `Retry-After` is respected. The list of recipes and photos is hard-coded at the top of the script.
If you re-fetch, re-read the wikitext and update `src/data/recipes.ts` by hand, because the data file is an adaptation, not generated.
