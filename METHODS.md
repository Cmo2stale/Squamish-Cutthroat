# CCT Spawner Survey: methods basis

This note explains what the app records and why, and which published methods each part follows. It is written for project staff, Squamish Nation fisheries staff and reviewers.

## The question

Where do Coastal Cutthroat Trout (CCT) spawn in Squamish watershed tributaries, and when? Adults are very hard to see on the spawning grounds, so the survey is built around **redds** (nests), which can be counted reliably. Adult presence is recorded at every redd and for every visit. That makes even "absent" a usable result.

## Survey design

| What | How | Basis |
|---|---|---|
| **Unit** | One visit to one reach of one creek on one day. Use the same reaches all season (index reaches). | Losee et al. 2016; Gallagher et al. 2007 |
| **Revisit interval** | About every 7 days, February to May. The app flags a reach as "due" after 7 days. | CCT redd life averaged 13.4 d and none lasted past 14–20 d (Losee et al. 2016). The protocol is to resurvey within less than the redd life, and in under 14 days (Gallagher et al. 2007; ODFW 2026). |
| **Season** | February to May. Expect timing to shift between years. | Skookum Creek redds ran Feb 2 to May 27, and the 50% date varied from Feb 13 to Apr 20 (Losee et al. 2016). |
| **When to go** | As flows drop after freshets. | Spawn timing appears flow-driven: redd counts peak as flows fall and spawning pauses during freshets (WDFW work reported by Native Fish Society 2017). |
| **Crew** | The same trained surveyors on the same creeks each season. | Redd counts vary with surveyor experience (Dunham et al. 2001, as cited in Losee et al. 2016). |

## What's recorded on each visit

- **Creek** from the project list, plus reach, date, surveyors, start and end time, and GPS start and end. Start and end times give effort in minutes.
- **Visibility** uses ODFW codes:
  - **1:** bottom of riffles and pools visible.
  - **2:** riffles only.
  - **3:** can't see the bottom (not surveyable).

  Visibility-3 visits are kept but marked "not surveyable". They are not treated as a "nothing found" result.
- **Flow** (Low / Normal / High) and **flow trend** (Falling / Steady / Rising). Water temperature is optional.
- **Adult cutthroat seen**: live fish of about 25 cm or more. Smaller fish are likely parr or smolts (Losee et al. 2016 counted only fish over 25 cm TL). The app keeps this count at least as high as the cutthroat recorded on redds.
- **Cutthroat carcasses**, and **other spawners seen** (steelhead/rainbow, coho, chum, pink, chinook, char, lamprey). These help attribute redds: steelhead overlap the CCT window, while coho and chum generally finish earlier.

## Redds

- **New redds:** any redd without a flag. Each one gets an ID for the bank flag (`creek initials-MMDD-number`, e.g. `LSC-0310-01`), GPS, time, and:
  - **Confidence:** Confirmed / Probable / Possible. This matches the project's field package and ODFW's 1/2/3 Confident/Probable/Uncertain. Confidence is recorded, not used as a filter.
  - **Adults on the redd:** Present / Absent. This is required on every redd. When adults are present, the app also records the number, species (including *CCT/RB unresolved*), behaviour (paired, digging, holding, single) and photo or video IDs.
  - **Optional:** pit length and width, the most reliable CCT measures (mostly 20–75 cm, Losee et al. 2016), plus channel position, best call on species, redd photo IDs and notes.
- **Re-checks:** flags from the last 21 days on the same reach appear on the next visit. The crew marks each **Still visible** or **Gone**, and adults present or absent. This is a simplified version of the Gallagher et al. (2007) redd-age codes. It prevents double counting and gives each redd a measured visible life. The app warns before finishing a visit with unchecked flags.
- **Spawning pairs:** two or more cutthroat on a redd, or "paired" behaviour, are highlighted and counted separately. Only 25 of 544 CCT redds (under 3%) had a fish on them in six seasons at Skookum Creek (Losee et al. 2016). Even one documented pair would be a significant local record.

## Nil results and detection

Every visit is kept, including ones where nothing was found. For a species that is hard to detect, repeated visits are what separate "not there" from "there but missed". The **Detections** export has one row per visit:
- **Surveyable:** 1 or 0.
- **Redds detected:** 1 or 0.
- **Adults detected:** 1 or 0.

That is the detection-history layout used for site-occupancy analysis (MacKenzie et al. 2002). It lets the project estimate how often adults or redds are missed, as well as where they occur.

## Exports

| Table | What's in it |
|---|---|
| Season summary | One row per creek, reach and season: visits, visits with good visibility, new redds by confidence, redds with adults, % of redds with adults, peak adult count, visits with adults, spawning pairs, first and last redd dates |
| Surveys | One row per visit, with all conditions, counts and effort |
| Redds | One row per redd: location, confidence, adults when found and on any later visit, last date seen visible, date gone, days visible, measurements |
| Detections | One row per visit, with the 1/0 detection history |

Excel puts these on four tabs. CSV produces four files. Coordinates are decimal degrees (WGS84, the phone's GPS).

## Creek list

The built-in list comes from the project documents:
- **Clear-water indicator creeks:** from the Field Survey & Redd ID Training Guide.
- **Priority creeks:** from the August 2026 working list.
- **Other candidate creeks:** from the original July 2026 list.

Crews can add other creeks in the field.

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
