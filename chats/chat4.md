# Today's focus and ideas management

_Started 2026-06-24 16:03 UTC_

---

## User

Now so today we should be able to find and add any task to today's focus and also I would like to be able to read notes without editing them right away. So probably here we can add these to today's focus from say the ideas page. Here we can have a list of all the ideas and sort and filter

## Assistant

Let me look at what's already in the project before planning.

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: grep]_

_[tool: view_image]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

This is a well-built existing app. I now understand it fully. Key finding: the app already contains a **read-only Note Reader** UI block in the template, but it's completely disconnected — `renderVals()` never returns `readerOpen`/`r`/`closeReader`/`editFromReader`, and there's no `openReader` method. Tapping any idea currently jumps straight into the editor.

So I'll: (1) wire up that reader so tapping an idea opens it read-only first with an Edit button; (2) add a "find any task" picker to add tasks to today's focus. The reader already has per-task "Today" toggles, which covers adding to focus from the ideas page.

_[tool: update_todos]_

Now the template edits — the "Find a task" button on the Today's focus card, and the new task picker sheet:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the logic. State, methods, vm routing, reader/picker viewmodels, and the return object:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now route idea taps to the reader. Update `vm`, `dueSoon`, `todayFocus.openIdea`, and calendar `openTasks`:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now build the reader (`r`) and picker viewmodels. I'll insert them right after the note editor `n` block closes (after the `}` ending `if (raw) {`), before the `// calendar` comment:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Let me verify it renders and test the new flows.

_[tool: show_html]_

_[tool: get_webview_logs]_

_[tool: eval_js]_

_[tool: show_html]_

_[tool: eval_js]_

Reader opens on tap. Now test the task picker:

_[tool: eval_js]_

Both flows work. Final check — searching and toggling a task in the picker:

_[tool: eval_js]_

All flows verified: search filters to 1 task, tapping adds it, and it appears in Today's focus. Handing off to the verifier.

_[tool: update_todos]_

Done. Three changes to Margin:

- **Tapping any idea now opens it read-only first** — a clean reader with the body, tags, due date, and tasks, plus an **Edit** button to drop into the full editor only when you want to. (The reader markup already existed in the file but was never wired up; it's now connected everywhere ideas are tapped — Today, Ideas, search, browse, calendar, due-soon.)
- **"Find a task to focus on…"** at the bottom of the Today's focus card opens a searchable picker of every open task across all ideas, so you can pull any one into today — not just the 4 auto-suggestions.
- From the reader, each task has a **Today** toggle, so you can also add tasks to today's focus straight from any idea on the Ideas page.

The Ideas page already had the all-ideas list with sort + filter, so I left that as-is.

_[tool: ready_for_verification]_

## User

So the next steps are sequential? However we want to be able to have a look at all the ideas as a list. Think of the best way to manage/select tasks for a day without being able to miss or forget about tasks or ideas.
However it may not be overwhelming

## Assistant

Good question — and it's the right thing to push on. Right now planning is sequential (open one idea at a time), which is exactly how tasks get forgotten. Let me reshape the "Find a task" picker into a proper **Plan your day** review: one scannable surface that shows *everything* open, but grouped by urgency so it never feels like a wall — plus a quiet, collapsed section for ideas that have no tasks yet, so those don't slip either.

Let me build it in small steps. First the logic:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now the template — replace the picker body with the grouped Plan-your-day layout:

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

Now I have the exact current block. Let me replace it:

_[tool: str_replace_edit]_

Let me rename the entry button to match the new planning surface, then verify:

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: eval_js]_

Loose section should have many ideas (most seed ideas have no checklist). Let me check why it's not showing:

_[tool: eval_js]_

It's all there — I just missed it in the prior text scan. Working: **This week** (4 tasks, with Mon/Fri due labels), **Anytime** (2 tasks), Today badges on selected tasks, and **Ideas without tasks · 12** collapsed behind a Show toggle. Overdue is correctly hidden (none in seed). Let me confirm the Show toggle and live count:

_[tool: eval_js]_

Count updates live (2→3). Let me just confirm the Show toggle expands the loose list:

_[tool: eval_js]_

_[tool: show_html]_

_[tool: eval_js]_

_[tool: eval_js]_

_[tool: eval_js]_

The sheet renders correctly. Now toggle Show in one clean call:

_[tool: eval_js]_

_[tool: eval_js]_

The whole header row is one button (label + "Show" together). Clicking it correctly:

_[tool: eval_js]_

Everything works. Toggle flips Show→Hide and reveals the 12 task-less ideas. Handing to the verifier.

_[tool: ready_for_verification]_

That error is from one of my own `eval_js` probes (`toggle.click` on an undefined match), not the app — it leaked into the console log. Let me reload fresh so the log is clean and re-verify:

_[tool: show_html]_

_[tool: get_webview_logs]_

The log is retaining my earlier `eval_js` throw (`undefined:6:11` is the eval sandbox, not the app file). Let me reset the webview log buffer by navigating away and back:

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

Clean now — that was stale noise from my own probe, not the app. Re-verifying:

_[tool: ready_for_verification]_

