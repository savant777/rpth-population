# Native switch / lock contract

Read from the existing bound test-copy Apps Script project on 7 November 2026 using `tools/apps-script/diagnostics/InspectSwitchCopy.gs`. No member values, properties, formulas, or sharing settings were changed. The diagnostic is separate from the deployed web bundle. Full local report: ignored `local-delivery/switch-native-log.txt`.

Lock event log A:K: EventID, LockID, logID (#Post), CharID, UserID, Lock Character Name, Lock Face Claim, Type, Effective Date, Lock Time (Month), Note.

Native formula columns L:Q: Previous Event Row, State After Event, Days After Event, End Date After Event, Check, Event Row. Copy row 2 formulas with relative references; do not write computed values. New input rows follow the last occupied A:K row even if L:Q formulas are prefilled. A non-purchase event leaves months blank. The exact native types are `เริ่มล็อก`, `ต่ออายุ`, `พักนับ`, `เริ่มนับต่อ`, `ยกเลิก`.

Pause requires previous state counting and previous end strictly greater than the event date; resume requires paused. Event dates cannot precede the previous event. Check must evaluate to `OK`. EventID must be unique. Pause stores previous end minus pause date as remaining days; resume uses that saved number to compute a new end. Date values are native Sheets dates, not formatted strings.

Native Check permits blank faceclaim G on subsequent events. Resolve it from the first event. Enforce immutable UID and CharID across the entire LockID history as well: the native Check compares CharID and face, but does not itself compare UserID.

Faceclaim Locks A:K: LockID, UserID, CharID, Lock Character Name, Lock Face Claim, Status, Remaining Days, End Date, Admin Note, Start Pause, Previous End Date. A2 spills lock IDs. F2 spills F:H. J/K pause displays currently refer only to event rows through 5000, so the switch writer stops before exceeding that bound. Never write summary or Public sheets.

Public Faceclaim Locks A:J: UserID, Lock Character Name, Lock Face Claim, End Date, CharID, LockID, Status, Remaining Days, Start Pause, Previous End Date. Native A1 QUERY selects B,D,E,H,C,A,F,G,J,K from the summary, including counting/paused only.

Characters D2 validation permits MAIN and SUB 1–6. Player E2 permits MAIN and SUB 1–3. The planner uses their intersection, does not expand either validation, and does not introduce a separate extra-slot permission database. Creating further slots requires aligning the native choices first; no silent invalid writes.

Switch plans reject future effective dates and dates before an already-recorded usage or relevant lock event, because current flags are changed immediately. Boundary pause on the expiration date is rejected with an explicit message to match the existing native Check; no new zero-day pause rule was inferred.
