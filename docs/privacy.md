# Privacy Policy — FFB Lens

Updated November 15, 2026. Applies to FFB Lens extension version 0.7.3.

## Data processed

- When a user clicks **Scan Reels on tab** on a Page or profile Reels tab, the extension reloads that tab once, reads Reel cards, and observes GraphQL responses Facebook has already loaded in it. It retains the account display name when available, account and Reel URLs, captions, posted dates, views, likes, comments, and shares when available in the response. It scrolls within the selected limit and can also read a CSV file chosen by the user or manually entered records. Normalized data is stored in Chrome IndexedDB on the device.
- The account URL provides context for scanned Reels, manually entered Reels, and CSV rows missing `page_url`. The extension does not make its own Facebook endpoint requests or read cookies, passwords, or content outside the selected tab. GraphQL responses are processed temporarily to extract the Reel fields above; raw responses are not stored.
- On a TikTok profile, the extension reads visible video cards, page data, and video responses already loaded in that tab. It stores the profile display name when available, profile and video URLs, captions, posted dates, and available view, like, comment, and share counts in the same local IndexedDB. It does not make its own TikTok endpoint requests or store raw responses.

## Sharing and transmission

FFB Lens has no server, account system, analytics, or tracking code. The extension does not send collected URLs, metrics, or captions to FFB Lens or third parties. When a user opens an original Reel, Chrome navigates to that URL at the user's request.

## Permissions

The extension requests Chrome's `sidePanel`, `activeTab`, and `scripting` permissions. Scanning asks for optional host access to the selected platform. If Chrome has not exposed the active tab's URL when a user clicks **Use account from tab** or **Scan**, the extension asks for optional Facebook and TikTok host access so it can identify that tab. Chrome may retain this access for later scans, and the user can revoke it in extension settings. The extension registers a platform content script to observe video responses while on a Reels or TikTok profile tab. The card-reading and scrolling script is injected only into the tab selected by the user. The extension does not request browsing-history access.

The Vietnamese/English language choice is stored in the extension's localStorage on the device so it persists when the side panel is reopened. The extension includes separate privacy pages for both languages.

## Deletion and export

Users can export the displayed list as CSV or XLSX. Chrome saves the exported file as directed by the user. After an account is selected and the user confirms, **Delete account data** removes all saved videos for that account from the extension's IndexedDB. Other accounts remain stored. Uninstalling the extension or clearing its data in Chrome may also remove those records. FFB Lens has no server copy from which to restore them.

## Limitations

Results reflect only Reels loaded and recognized during the scan, plus any additional imported data. Facebook metrics may be rounded or missing. Automated collection must comply with Meta's terms and the user's access rights.

If a future version changes how data is processed or shared, this policy and the notice in the extension must be updated before release.
