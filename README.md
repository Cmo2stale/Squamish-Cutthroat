# CCT Field Survey

Offline field datasheets for Coastal Cutthroat Trout (CCT) spawning surveys in the Squamish River watershed. These are the digital versions of the **C1 Streamwalk / Spawning Survey** and **C2 Redd Characterization** sheets from the project's *CCT Field Reference & Datasheet Package*.

The app is part of the HCTF capacity grant *Indigenous Capacity to Identify and Protect Cutthroat Spawning Habitat* (CAP-0000000288). It was prepared by Riverside Solutions Inc.

**Open the app:** https://cmo2stale.github.io/Squamish-Cutthroat/

## Setting up a phone

1. Open the link once on the phone while you have signal.
2. Add it to the home screen:
   - **iPhone:** in Safari, tap Share, then "Add to Home Screen".
   - **Android:** in Chrome, open the menu, then "Install app".
3. From then on, always open it from the home screen. It works with no cell service, and GPS works without signal.

## In the field

- **Start a survey** at the reach. The app fills in today's date, the start time, the observers and the GPS start. Then add the stream, reach ID, survey layer and conditions.
- Walk upstream and log as you go:
  - **+ Fish or carcass** records species, count, size, time, GPS and photo IDs.
  - **+ Redd (C2)** records the redd ID for the bank flag, GPS, pit and tailspill size, depth, velocity, substrate, habitat unit, confidence, adult on the redd, species attribution and its basis, and whether it falls in the Feb–May window. Typical CCT ranges are shown under each measurement and flagged when a value falls outside them. The app also warns if a redd is attributed to CCT on shape alone.
- The **reach summary** (total CCT redds, live CCT, coho and other species noted) fills in by itself.
- **Finish survey** sets the end time and GPS end.
- Everything saves on the phone as you type.

## After the field day

- **Export:** produces an Excel workbook with three tabs (Surveys, Fish observations, Redds), or three CSV files. Every row has a *Survey key* so the tabs can be joined.
- **Backup:** save a backup file after each field day. Surveys live only on that phone until they are exported or backed up.

## Data

Nothing is uploaded. There are no accounts and no server. Data stays on the device until a crew member exports or backs it up and chooses where to send it.

## Notes for maintainers

- This is a static site with no build step: `index.html`, `styles.css`, `app.js`, `xlsx.js` (the Excel writer) and `sw.js` (the offline cache).
- When you change any file, bump `VERSION` in `sw.js` and `APP_VERSION` in `app.js`. Installed copies will then pick up the update.
- Reference ranges come from the CCT Field Reference & Datasheet Package (A2, A5, B2), drawing on Losee et al. (2016).
