# FFB Lens 0.7.6 Release Checklist

## Current status

- The MV3 source, 16/48/128 px icons, side panel, sample file, in-extension privacy pages, and a draft public privacy policy are present.
- Running the package command creates `release/ffb-lens-0.7.6.zip`. The ZIP excludes `node_modules`, TypeScript source, and access keys.
- Real-world testing is still needed on the Reels tabs of multiple Pages and profiles because Meta can change the DOM or response structure. This build has not been verified end to end on a logged-in Facebook profile in this environment.
- Test TikTok profile scans on a logged-in browser before release: verify profile URL recognition, host permission, video tiles, scrolling, views, dates, likes, comments, shares, deduplication after rescanning, and the Facebook/TikTok account separation. TikTok page behavior has not been verified live in this environment.

## Checks before Chrome Web Store submission

1. Run `npm ci`, `npm test`, and `npm run build`, then inspect `dist/manifest.json` and the ZIP package.
2. Test Facebook Reels tabs from several Pages and profiles in Chrome. Cover `/<username>/reels/`, `profile.php?id=<id>&sk=reels_tab`, and `/people/<name>/<id>/reels/`. Confirm that **Open Reels tab** generates `sk=reels_tab` for numeric profiles and that two profile IDs remain separate. Scan a profile whose display name differs from its URL, then verify **ACCOUNT**, saved video labels, and the account status show that name; rescan to verify older saved videos update too. Select an **ACCOUNT** and confirm the account URL and Reels link update; selecting **All accounts** should clear the URL. Grant Facebook access on the first scan; verify that the tab reloads once, 10/30-scroll scans, early stopping, URLs, posted dates, likes, comments, and any Share counts present in browser-loaded responses. Compare the Share coverage shown in scan status with two Reels opened individually. Switch between Vietnamese and English during and after a scan, reopen the side panel to confirm language persistence, and open both privacy pages. Check coverage and missing fields in the status line, deduplication, and filters. Also test permission denial, opening the panel on another tab before returning to Facebook, the sample CSV, and CSV/XLSX exports.
3. Test TikTok `tiktok.com/@username` profiles in Chrome. Confirm the optional TikTok permission prompt, video URLs and views from visible tiles, additional videos after scrolling, available engagement/date fields, missing-field display, stop/rescan behavior, account display name, and CSV/XLSX exports. Check that a TikTok video ID matching a Facebook Reel ID remains a separate record.
4. Check that saved Facebook and TikTok accounts show `[Facebook]` and `[TikTok]` in **ACCOUNT**, account status, and video cards. Accounts with the same name on one platform should also show their URLs in **ACCOUNT**. Select one **ACCOUNT** and verify **Delete account data** names that account and counts all its saved videos, including those hidden by filters. Cancel once, then confirm. Check that its videos disappear, another account's videos remain, and **All accounts** keeps the delete button disabled. Try the button during a scan and while a scan finishes; it should remain disabled.
5. Try **Select Top by: Most shares → Top 10 → Reorder Top by: Newest** with at least 12 videos. Verify that only the ten most-shared videos appear, now in newest-first order; excluded videos must not re-enter. Check missing values, duplicate criteria, and **Break ties by** when dates match. CSV/XLSX exports must follow the displayed order. Repeat after switching languages.
6. Confirm the conditions for permitted automated collection from Meta and TikTok before broad use or release. Prepare screenshots and a store description stating that the extension reads the DOM and video responses already loaded in the tab, metrics can be rounded, and scan coverage is bounded. Do not present sample data as real data.
7. Publish the **privacy policy** at a public URL controlled by the publisher. `docs/privacy.md` is a draft for review; a local file path is not a substitute for the Developer Dashboard URL. [Chrome Web Store requires a privacy policy for extensions handling user data, even when data stays local](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/).
8. Complete Privacy practices and listing fields to match actual behavior. [Google's guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/) requires consistency with the privacy policy.
9. The publisher should review contact details, the developer account, and the review process. [Chrome Web Store accepts a ZIP through the Developer Dashboard](https://developer.chrome.com/docs/webstore/publish/). This checklist does not publish or upload the extension.

## Packaging commands

```bash
npm run build
npm run package
```

Create a new ZIP after rebuilding so an outdated version is not submitted. Before adding a Facebook connector, reassess permissions, data policy, user notices, and the store description.
