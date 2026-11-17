# Facebook Reel Share counts

Updated November 17, 2026 for FFB Lens 0.7.4.

## What the extension can read now

FFB Lens observes `/api/graphql/` responses that Facebook loads while the selected Page or profile Reels tab is scanned. It associates data with Reel IDs in `aggregated_fb_shorts` and saves a Share count only when the Reel's response includes one. The parser accepts `total_share_count`, `share_count`, `reshares.count`, `share_count_reduced`, and `i18n_share_count`. Exact counts take priority over reduced counts. The scan status reports how many recognized videos have Share data; an absent count remains blank rather than becoming zero. No additional Facebook request is made.

The alternate names come from [an archived Facebook Comet GraphQL fragment](https://github.com/zine-research/zine-2019-website/blob/master/img/ZINE/Heroslider_ph_files/LWAnYtGmUMV.js.download), where `share_count` is an alias for `reshares.count` and `i18n_share_count` is an alias for `share_count_reduced`. This establishes possible response shapes, but does not prove that the current Reels grid includes them.

## Remaining uncertainty

The user's Reel detail screenshot displays 118 Shares. FFB Lens currently scans the Reels grid, and the available local test fixture has no Share field. It is therefore **unverified** whether the grid response includes that Reel's Share count. The detail view may receive a separate response; this is an inference to test with a redacted browser response, not a confirmed route or field path. A Share count shown in the detail UI should not be copied to another Reel or inferred from views, likes, or comments.

Meta documents a [`shares.count` field for Page posts](https://developers.facebook.com/docs/graph-api/reference/pagepost), but that Graph API route requires its own access conditions and is separate from the browser responses FFB Lens observes. Meta's [Page Video Reels endpoint reference](https://developers.facebook.com/docs/graph-api/reference/page/video_reels) says reading that endpoint is unsupported. Neither document establishes a public, permission-free API for the Share count of every third-party Reel.

## Live verification needed

1. Reload FFB Lens 0.7.4, scan a Page's Reels tab, and note the `shares N` coverage in the final status line.
2. Compare two saved Reels with the Share counts visible when each Reel is opened.
3. If the grid scan reports no Share data, inspect DevTools **Network → Fetch/XHR** on one opened Reel. Find a response containing that Reel ID and a Share count, then retain only a small redacted JSON excerpt showing the ID, the Share field, and its parent keys. Do not share cookies, headers, access tokens, or a complete HAR.
4. Use that excerpt to determine whether an optional detail-view enrichment path can associate the value with the correct Reel. Batch navigation to every Reel should be assessed separately because it would load additional pages and increase scan time.
