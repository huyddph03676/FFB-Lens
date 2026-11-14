# Phase 4 — Facebook Data Integration Research

> **Update through version 0.6.1:** The extension scans a Page or profile Reels tab, scrolls up to 100 steps, and observes Reel responses Facebook has already loaded in the tab to read posted dates, views, likes, comments, and captions. It does not issue its own GraphQL requests. The user-provided SortLens CSV contains those fields for six reference Reels but no shares column. The Page workflow has been tested by the user; profile scanning still needs live verification. Chrome permission enables the browser operation but does not replace Meta's permission under its [automated collection policy](https://about.fb.com/news/2021/04/how-we-combat-scraping/). The historical “not implemented” decisions below predate version 0.4.1.

Reviewed on **November 14, 2026**. Meta documentation and access rules can change; check them again before developing a connector. This report distinguishes technical feasibility, access rights, and data completeness.

## Historical implementation decision

CSV was the first data source at this stage. The decisions in this table record the earlier research phase and do not describe the current build. Version 0.6.1 includes content scripts and optional Facebook host access, but it still does not use the official Meta Graph API or claim to scan an account's complete Reel history.

| Source | Technical feasibility | Access conditions and limits | Decision at the time |
|---|---|---|---|
| User-provided CSV | Import, normalization, ranking, and export worked | The provider must have rights to use the data; completeness was unverified | Use as the initial source |
| Graph API for a managed Page | Page API and [Reel video insights](https://developers.facebook.com/docs/graph-api/reference/video/video_insights/) exist | Requires a Page role/token and Meta-granted permissions; list endpoints and fields need validation on a real Page | Experiment only after obtaining a suitable Page and permissions |
| Graph API for another Page | Approved [Page Public Content Access](https://developers.facebook.com/docs/graph-api/reference/page/) may permit some public data | A complete Reel list or every view count for an arbitrary Page was not established | Not implemented |
| Meta Content Library | Contains public data and Reel filters | [Controlled research access](https://developers.facebook.com/docs/content-library-and-api); its API runs in an approved research environment and CSV downloads have separate conditions | Do not treat it as a general Chrome connector |
| Content script on a Facebook tab | Chrome can [read a page's DOM](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts/) with suitable permission | Meta says [automated collection requires prior permission](https://about.fb.com/news/2021/04/how-we-combat-scraping/). Browser permission does not replace Meta permission | Not implemented at that stage |
| Licensed data provider | Licensed data could fit the shared source contract | A contract must define scope, storage/export rights, and metric definitions | Consider only with a specific provider |

## Questions for the official Meta Graph API

1. [Page API](https://developers.facebook.com/docs/graph-api/reference/page/) distinguishes access to a managed Page from approved Page Public Content Access. Being logged into Facebook in Chrome does not grant Graph API permissions.
2. [Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/) points Reel listings to `Page VideoReels`, while the [`Page VideoReels` reference](https://developers.facebook.com/docs/graph-api/reference/page/video_reels/) says reading that endpoint is unsupported. **These documents appeared inconsistent when reviewed**; verify behavior with a test account that has rights to a managed Page rather than assuming the endpoint works for another Page.
3. [Reel video insights](https://developers.facebook.com/docs/graph-api/reference/video/video_insights/) exposes different metrics: `blue_reels_play_count` excludes replays, while `fb_reels_total_plays` includes them. [Meta Content Library](https://developers.facebook.com/docs/content-library-and-api/appendix/data-dictionary) defines views based on content appearing on screen, subject to its display rules. Do not automatically place these distinct metrics into the current `views` column or combine them in one ranking without a defined comparison.
4. [Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/) has response limits and pagination. Even if an API returns data, check the number of Reels in the selected period, query limits, hidden or restricted content, and collection time before calling the result a Top list for an entire Page.

## What the reference product showed

The [SortLens guide](https://usesortlens.com/knowledge-base/facebook) describes operation on a Reels tab, scrolling to load more within a selected period, and using counts Facebook provides to the browser; displayed views may be rounded. This product description does not establish data-collection rights or the ability to retrieve a Page's complete history. FFB Lens has its own reader and scan flow and does not reuse SortLens code.

## Prepared architecture

`src/data/sources.ts` defines `SourceAdapter` and `SourceBatch`. The initial `csvFileSource` adapter marks coverage as `unverified`. Every batch passes through `ingestSourceBatch` to validate URLs, timestamps, metrics, and duplicates before storage. The contract distinguishes `user_supplied_views`, Facebook-displayed views, Reel plays, and Content Library views. Ingestion rejects Reel plays and Content Library views in the `views` field as if they were the same metric.

Each Reel stores `source` and `collected_at`. Batch metadata such as `coverage`, `accessBasis`, and `viewsMetric` currently exists only during ingestion. **Before releasing an API connector**, persist that metadata and add UI explaining metric definitions, completeness, and usage rights. A code-assigned `accessBasis` value is not evidence of Meta approval.

## Steps to evaluate an official Meta source

1. Select a **Page managed by the tester** and a Meta app with the necessary permissions. Check permission and Graph API version requirements in Meta's documentation at test time. Do not put access tokens in chat, CSV files, or source control.
2. Use an official tool such as Graph API Explorer to test whether the Page can list Reels, whether IDs, permalinks, posted dates, and captions are complete, and which metrics are actually readable. Record permission errors and pagination limits.
3. Compare sample Reels with the Page management UI to establish metric definitions and update timing. Do not equate `plays` with `views` without evidence.
4. If the experiment succeeds and usage rights are confirmed, design the OAuth/token flow and provenance storage before adding an adapter. Request only the minimum Chrome permissions needed by a working connector; [Chrome supports optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions/) where appropriate.
5. Test coverage: Reels read, oldest and newest dates, pagination pages, missing fields, and completion status. Call a result “Top N for the Page in this period” only when coverage is verified; otherwise call it “Top N in collected data.”

### Fearless Motivation reference Page

There is no confirmation that the user manages this Page or has Page Public Content Access. The URL `https://www.facebook.com/fearlessmotivationofficial/reels/` identifies the account being scanned or imported, but the extension cannot guarantee the ten most-viewed Reels across that Page's complete history.
