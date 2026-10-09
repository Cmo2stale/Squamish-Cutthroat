# CCT Spawner Survey

An offline app for weekly Coastal Cutthroat Trout (CCT) spawning surveys in Squamish watershed tributaries. On each visit, crews count new redds, record whether adults were present or absent, re-check last week's flags, and log the visit even when nothing is found.

It was built for the HCTF capacity grant *Indigenous Capacity to Identify and Protect Cutthroat Spawning Habitat* (CAP-0000000288), for Squamish Nation field crews to try. It was prepared by Riverside Solutions Inc.

**Open the app:** https://cmo2stale.github.io/Squamish-Cutthroat/

See **[METHODS.md](METHODS.md)** for the survey design and the published methods it follows: Losee et al. 2016, Gallagher et al. 2007, ODFW 2026 and Trout Unlimited 2019.

## Setting up a phone

1. Open the link once while you have signal.
2. Add it to the home screen:
   - **iPhone:** in Safari, tap Share, then "Add to Home Screen".
   - **Android:** in Chrome, open the menu, then "Install app".
3. From then on, open it from the home screen. It works with no cell service, and GPS works without signal.

## On each visit

1. **Start a survey** at the bottom of the reach and pick the creek. The date, time, crew and GPS fill in by themselves.
2. Set **visibility** (1, 2 or 3) and **flow**.
3. **Check last week's flags:** mark each one still visible or gone, and adults present or absent.
4. Tap **+ New redd** for each unflagged redd. Record the confidence and adults **present or absent**, then flag it on the bank with the ID shown.
5. Count **adult cutthroat** seen in the reach (about 25 cm or longer).
6. At the top of the reach, tap **Finish survey**. A visit with no redds is saved as a nil result.

Everything saves on the phone as you go. Reaches show up under **Due for a visit** once 7 days have passed during February to May.

## After the field day

- **Export:** choose Excel (four tabs) or CSV (four files): Season summary, Surveys, Redds and Detections.
- **Backup:** save a backup file after each field day. Surveys live only on that phone until they are exported or backed up.

Data entered in version 1 (C1/C2 datasheets) is carried over automatically, and old backups can still be restored.

## Data

Nothing is uploaded. There are no accounts and no server.

## Notes for maintainers

- This is a static site with no build step: `index.html`, `styles.css`, `app.js`, `xlsx.js` (the Excel writer) and `sw.js` (the offline cache).
- When you change any file, bump `VERSION` in `sw.js` and `APP_VERSION` in `app.js`. Installed copies will then update.
- The creek list is the `CREEKS` constant at the top of `app.js`.
