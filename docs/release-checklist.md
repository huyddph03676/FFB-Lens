# FFB Lens 0.6.3 Release Checklist

## Current status

- The MV3 source, 16/48/128 px icons, side panel, sample file, in-extension privacy pages, and a draft public privacy policy are present.
- Running the package command creates `release/ffb-lens-0.6.3.zip`. The ZIP excludes `node_modules`, TypeScript source, and access keys.
- Real-world testing is still needed on the Reels tabs of multiple Pages and profiles because Meta can change the DOM or response structure. This build has not been verified end to end on a logged-in Facebook profile in this environment.

## Checks before Chrome Web Store submission

1. Run `npm ci`, `npm test`, and `npm run build`, then inspect `dist/manifest.json` and the ZIP package.
2. Test Reels tabs from several Pages and profiles in Chrome. Cover `/<username>/reels/`, `profile.php?id=<id>&sk=reels_tab`, and `/people/<name>/<id>/reels/`. Confirm that **Open Reels tab** generates `sk=reels_tab` for numeric profiles and that two profile IDs remain separate. Scan a profile whose display name differs from its URL, then verify **ACCOUNT**, saved Reel labels, and the account status show that name; rescan to verify older saved Reels update too. Select an **ACCOUNT** and confirm **Page or profile URL** and the Reels link update; selecting **All accounts** should clear the URL. Grant Facebook access on the first scan; verify that the tab reloads once, 10/30-scroll scans, early stopping, URLs, posted dates, likes, and comments. Switch between Vietnamese and English during and after a scan, reopen the side panel to confirm language persistence, and open both privacy pages. Check coverage and missing fields in the status line, deduplication, and filters. Also test permission denial, opening the panel on another tab before returning to Facebook, the sample CSV, and CSV/XLSX exports.
3. Confirm the conditions for permitted automated collection from Meta before broad use or release. Prepare screenshots and a store description stating that the extension reads the DOM and Reel responses already loaded in the tab, metrics can be rounded, and scan coverage is bounded. Do not present sample data as real data.
4. Publish the **privacy policy** at a public URL controlled by the publisher. `docs/privacy.md` is a draft for review; a local file path is not a substitute for the Developer Dashboard URL. [Chrome Web Store requires a privacy policy for extensions handling user data, even when data stays local](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/).
5. Complete Privacy practices and listing fields to match actual behavior. [Google's guidance](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy/) requires consistency with the privacy policy.
6. The publisher should review contact details, the developer account, and the review process. [Chrome Web Store accepts a ZIP through the Developer Dashboard](https://developer.chrome.com/docs/webstore/publish/). This checklist does not publish or upload the extension.

## Packaging commands

```bash
npm run build
npm run package
```

Create a new ZIP after rebuilding so an outdated version is not submitted. Before adding a Facebook connector, reassess permissions, data policy, user notices, and the store description.
