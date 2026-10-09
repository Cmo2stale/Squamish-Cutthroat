# CCT Stream Survey: methods basis

This note explains what the app records and why, and which published methods each part follows. It is written for project staff, Squamish Nation fisheries staff and reviewers.

## The question

Where do Coastal Cutthroat Trout (CCT) spawn in Squamish watershed tributaries, and when? Adults are very hard to see on the spawning grounds, so the survey is built around **redds** (nests), which can be counted reliably. Adult presence is recorded at every redd and for every visit. That makes even "absent" a usable result.

## Survey design

| What | How | Basis |
|---|---|---|
| **Unit** | One visit to one reach of one creek on one day. Use the same reaches all season (index reaches). | Losee et al. 2016; Gallagher et al. 2007 |
| **Revisit interval** | About every 7 days, February to May. | CCT redd life averaged 13.4 d and none lasted past 14–20 d (Losee et al. 2016). The protocol is to resurvey within less than the redd life, and in under 14 days (Gallagher et al. 2007; ODFW 2026). |
| **Season** | February to May. Expect timing to shift between years. | Skookum Creek redds ran Feb 2 to May 27, and the 50% date varied from Feb 13 to Apr 20 (Losee et al. 2016). |
| **When to go** | As flows drop after freshets. | Spawn timing appears flow-driven: redd counts peak as flows fall and spawning pauses during freshets (WDFW work reported by Native Fish Society 2017). |
| **Crew** | The same trained surveyors on the same creeks each season. | Redd counts vary with surveyor experience (Dunham et al. 2001, as cited in Losee et al. 2016). |
| **Effort** | A start/stop clock records the time actually spent walking the reach, in minutes. The clock survives the phone locking, the app closing and a restart. | Counts are only comparable alongside the effort that produced them (Gallagher et al. 2007). |

## What's recorded on each visit

- **Stream name**, typed in or picked from the project list, plus an optional reach name, the date, and the crew initials.
- **Survey time** from the clock: start, end and total minutes walked. The minutes are the effort figure every count is reported against.
- **Visibility** uses ODFW codes:
  - **1:** bottom of riffles and pools visible.
  - **2:** riffles only.
  - **3:** can't see the bottom (not surveyable).

  Visibility-3 visits are kept but marked "not surveyable". They are not treated as a "nothing found" result.
- **Flow** (Low / Normal / High) and **flow trend** (Falling / Steady / Rising). Water temperature is optional.
- **Fish seen or not seen**, as a presence/absence answer that must be given before a survey can be finished — "none seen" is a recorded result, not a blank. When fish were seen, the count is live adults of about 25 cm or more; smaller fish are likely parr or smolts (Losee et al. 2016 counted only fish over 25 cm TL). Recording a cutthroat on a redd sets the reach answer to present automatically, so the two cannot disagree.
- **Other species seen** (steelhead/rainbow, coho, chum, pink, chinook, char, lamprey). These help attribute redds: steelhead overlap the CCT window, while coho and chum finish earlier but leave their redds on the bed.
- **Notes** on the survey: other observations, access, barriers, beaver dams, channel change.

## Redds

- **Every redd found gets a record.** Each one takes an ID for the bank flag (`stream initials-MMDD-number`, e.g. `LSC-0310-01`), a time, a GPS point and:
  - **Confidence: Confirmed / Probable / Possible.** Recorded on every redd and carried through to the exports, never used to filter one out. A *Possible* redd is reported as a Possible redd, not discarded. Over-calling is the standard beginner error, and females also dig test pits that hold no eggs, so the scale exists to let a surveyor be honest rather than decisive.
  - **Age, on a 1 to 3 scale.** This is the field judgement of how fresh the redd is, and it is what dates spawning:
    - **1 — fresh.** Clean, bright gravel with no algae growth. Built since the last freshet, so it dates spawning to about the week of the survey.
    - **2 — some algae growth, no fish present.** Older than a week or two, but still measurable.
    - **3 — full algae growth, no longer measurable.** Recorded as present; the app locks the measurement fields so nothing spurious is entered.
  - **Length and width, in centimetres.** Length runs from the upstream edge of the pit to the downstream end of the tailspill mound; width is the widest point across the disturbed gravel. These are the measurements that separate species. Coho finish spawning before the CCT window but their redds remain on the bed throughout it, and they are considerably larger. CCT pits run roughly 20–75 cm and average about 48 cm long by 43 cm wide (Losee et al. 2016). The app reads the entered length back against those ranges and flags anything clearly salmon-scale.
  - **Adults on the redd:** Present / Absent, required on every redd. When adults are present the app also records the number, species (including *CCT/RB unresolved*) and behaviour (paired, digging, holding, single).
  - **Whose redd** — the crew's best call, made from the measurement, the timing and any fish present together, never the shape alone.
  - **Optional:** channel position, photo or video IDs, and notes.
- **GPS is entered by hand.** The crew reads the point off a handheld and types it in. Decimal degrees are parsed out into latitude and longitude columns for the export; UTM and any other format are kept exactly as typed. Nothing depends on the phone having a usable fix under canopy.
- **Flagging.** Every redd is flagged on the bank immediately upstream, with the date, the number of redds at that spot, the redd ID and the surveyor's initials written on the tape. The count on the tape is what stops a cluster being re-counted later. Only unflagged redds are recorded as new on the next visit.
- **Spawning pairs:** two or more cutthroat on a redd, or "paired" behaviour, are highlighted and counted separately. Only 25 of 544 CCT redds (under 3%) had a fish on them in six seasons at Skookum Creek (Losee et al. 2016). Even one documented pair would be a significant local record.

## Nil results and detection

Every visit is kept, including ones where nothing was found. For a species that is hard to detect, repeated visits are what separate "not there" from "there but missed". The **Surveys** export carries, for every visit, a surveyable flag (1 unless visibility was 3), the redd count, and whether cutthroat were seen as 1 or 0.

That is the detection-history layout used for site-occupancy analysis (MacKenzie et al. 2002). It lets the project estimate how often fish or redds are missed, as well as where they occur. The survey minutes on each row are what make a zero from a thorough walk distinguishable from a zero from a quick one.

## Exports

| Table | What's in it |
|---|---|
| Season summary | One row per stream, reach and season: visits, visits with good visibility, total and mean survey minutes, redds by age class, redds with adults, visits with fish, peak count, spawning pairs, and the dates of the first redd, first fresh redd and last redd |
| Surveys | One row per visit: crew, start and end time, survey minutes, water temperature, visibility, flow, redds by age and by confidence, fish seen as 1/0, surveyable as 1/0, and notes |
| Redds | One row per redd: GPS as entered plus parsed latitude and longitude, confidence, age and what the age means, length and width, adults, species, whose redd, and photo references |

Excel puts these on three tabs. CSV produces three files. Coordinates are whatever the crew's handheld was set to; decimal degrees are additionally parsed into latitude and longitude columns.

## Creek list

The stream field takes any name typed into it. The suggestion list comes from the project documents:
- **Clear-water indicator creeks:** from the Field Survey & Redd ID Training Guide.
- **Priority creeks:** from the August 2026 working list.
- **Other candidate creeks:** from the original July 2026 list.

Anything else a crew types is remembered and suggested next time.

## The app as a training tool

The app is used by crew members who may be running their first redd survey, so the reasoning sits next to the decision rather than in a manual left in the truck.

- **Diagrams at the point of measurement.** Scale drawings of a redd in section and in plan, with the length and width dimensions pinned to the features they are defined against, appear directly above the measurement fields. The definition and the drawing are generated from the same geometry, so they cannot drift apart.
- **Live feedback on the measurement.** An entered length is placed on a scale against the measured cutthroat range (19–75 cm), the steelhead overlap, and salmon scale. Anything past about 150 cm is flagged as likely coho from the fall. This is the attribution problem handled at the moment of entry rather than at the desk.
- **A decision aid before the call.** A "looks like a redd / probably not" comparison is one tap away inside the redd form, covering the three common false positives: freshet scour, a ford or animal crossing, and a test dig.
- **A field guide** of nine short lessons: what a redd is, where to look, whether it is one, how fresh, how to measure, whose it is, why adults are almost never seen, why nil results matter, and safety. It works offline like the rest of the app.
- **A self-check** of six questions drawn at random, each with the reasoning afterwards, intended to be run before the first survey of a season.

The content is kept in `learn.js`, separate from the survey logic, so it can be revised without touching the data handling.

## Data

All data stays on the device. There is no account, server or upload. Crews export or back up and choose where the files go. That keeps control of the data with the people collecting it, in line with the principle Coastal First Nations Guardian programs apply through OCAP® in their Regional Monitoring System.

## Sources

- Losee, J.P., Phillips, L. & Young, W.C. (2016). Spawn timing and redd morphology of anadromous Coastal Cutthroat Trout in a tributary of south Puget Sound, Washington. *North American Journal of Fisheries Management* 36:375–384.
- Gallagher, S.P. & Gallagher, C.M. (2005). Discrimination of Chinook and coho salmon and steelhead redds and evaluation of the use of redd data for estimating escapement. *NAJFM* 25:284–300.
- Gallagher, S.P., Hahn, P.K.J. & Johnson, D.H. (2007). Redd counts. In *Salmonid Field Protocols Handbook*, American Fisheries Society. https://wildsalmoncenter.org/wp-content/uploads/2008/07/SFPH-Chapter-7-Redd-Counts.pdf
- Oregon Department of Fish and Wildlife (2026). *Winter Steelhead Spawning Survey Manual.* https://odfw-oasis.forestry.oregonstate.edu/sites/default/files/2026-02/STWManual2026FINAL.pdf
- Trout Unlimited (2019). *Redd Survey Handbook*, v1 (Lemon & Rummel). https://www.tu.org/wp-content/uploads/2020/01/Redd-Survey-Handbook-v1_w_appendices.pdf
- Dunham, J., Rieman, B. & Davis, K. (2001). Sources and magnitude of sampling error in redd counts for bull trout. *NAJFM* 21:343–352.
- MacKenzie, D.I. et al. (2002). Estimating site occupancy rates when detection probabilities are less than one. *Ecology* 83:2248–2255.
- Native Fish Society (2017). Quiet on the spawning grounds (WDFW flow and redd-timing work). https://nativefishsociety.org/news-media/quiet-on-the-spawning-grounds
- Coastal First Nations, Coastal Stewardship Network. *RMS: Technology for Stewardship and Sovereignty.* https://coastalfirstnations.ca/wp-content/uploads/2025/12/RMS-Technology-for-Stewardship-and-Sovereignty.pdf
- Riverside Solutions Inc. (2026). *CCT Field Reference & Datasheet Package* v0.2; *Field Survey & Redd ID Training Guide* v0.2; *CCT Squamish Watershed Summary* v0.6.
