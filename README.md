# CCT Stream Survey

An offline app for Coastal Cutthroat Trout (CCT) spawning surveys in Squamish watershed tributaries. A crew walks a stream, runs a clock for the survey time, records every redd with a measurement and an age, and logs whether fish were seen — including when nothing is found.

It was built for the HCTF capacity grant *Indigenous Capacity to Identify and Protect Cutthroat Spawning Habitat* (CAP-0000000288), for Squamish Nation field crews to try. It was prepared by Riverside Solutions Inc.

**Open the app:** https://cmo2stale.github.io/Squamish-Cutthroat/

The full written method, the creek list and the survey timing are in the **CCT Spawner & Redd Survey Protocol v0.1**. See **[METHODS.md](METHODS.md)** for the published methods the app follows: Losee et al. 2016, Gallagher et al. 2007, ODFW 2026 and Trout Unlimited 2019.

## Setting up a phone

1. Open the link once while you have signal.
2. Add it to the home screen:
   - **iPhone:** in Safari, tap Share, then "Add to Home Screen".
   - **Android:** in Chrome, open the menu, then "Install app".
3. From then on, open it from the home screen. It works with no cell service.

## On each survey

1. **Start a survey** at the bottom of the reach. Type the stream name, the crew initials and the date.
2. Tap **Start** on the clock as you step in. The clock keeps running while the phone is locked or the app is closed, and survives a restart. Pause it for a break, stop it at the top of the reach. If you forget to start it, type the times by hand.
3. Record the **water temperature** and the **visibility** (1, 2 or 3).
4. Tap **Redd found** for each redd. Enter:
   - the **GPS point**, read off the handheld and typed in — decimal degrees or UTM,
   - **how sure** you are it's a redd: Confirmed, Probable or Possible,
   - the **age**: 1 fresh with no algae, 2 some algae and no fish, 3 full algae and no longer measurable,
   - the **length** (upstream edge of the pit to the downstream end of the tailspill mound) and the **width**, unless it's age 3,
   - whether **adults** were on it.

   Flag the redd on the bank: date, how many redds at that spot, the redd ID and your initials.
5. Record **fish seen or not seen** in the reach, and any other species.
6. Write the **notes**, then **Finish survey**. A walk that finds nothing is saved as a nil result.

Everything saves on the phone as you go.

## Why the measurement matters

Coho finish spawning before the cutthroat window, but their redds are still on the bed through it. They are considerably larger than cutthroat redds, so the length and width are how a crew tells them apart. Cutthroat pits run roughly 20–75 cm and average about 48 × 43 cm.

As a length is entered, the app places it on a scale against the cutthroat, steelhead and salmon ranges and flags anything past about 150 cm as likely coho from the fall. That is the only piece of interpretation the app does; everything else about redd identification lives in the **CCT Redd Field Reference** one-pager and the survey protocol.

## After the field day

- **Export:** Excel (three tabs) or CSV (three files): Season summary, Surveys and Redds.
- **Backup:** save a backup file after each field day. Surveys live only on that phone until they are exported or backed up.

Data from earlier versions of the app is carried over automatically, and old backups can still be restored.

## Data

Nothing is uploaded. There are no accounts and no server.

## Notes for maintainers

- This is a static site with no build step: `index.html`, `styles.css`, `app.js`, `xlsx.js` (the Excel writer) and `sw.js` (the offline cache).
- When you change any file, bump `VERSION` in `sw.js` and `APP_VERSION` in `app.js`. Installed copies will then update.
- The suggested stream list is the `CREEK_GROUPS` constant at the top of `app.js`. Crews can type any other name; it's remembered for next time.
- The clock is stored as `accum` (milliseconds banked) plus `runFrom` (the timestamp of the current run), so elapsed time is correct across reloads, backgrounding and restarts.
