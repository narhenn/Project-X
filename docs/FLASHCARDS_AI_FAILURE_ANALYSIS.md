# Why AI-Generated Flashcards Fall Back to Static File — Detailed Analysis

## How it’s implemented (end-to-end)

### 1. User flow

- User is on **Watch** page (`app/watch/page.tsx`), watching a segmented video.
- At the end of a segment, the **quiz** opens (questions from `POST /api/generate-quiz` → Gemini).
- If the user **fails** the quiz, they see two options: **Retry quiz** and **Show flashcards**.
- When they click **Show flashcards**, the app should show **AI-generated** flashcards for that segment, but you observe it often shows the **static fallback** from `data/segmentFlashcards.ts` instead.

---

### 2. Where flashcards are requested (client)

**File:** `app/watch/page.tsx`  
**Handler:** `handleShowFlashcards` (around lines 188–216).

Flow:

1. **Slides for this segment**
   - `effectiveSegmentSlides = segmentSlidesFromApi ?? demoModule.segmentSlides ?? []`
   - `segmentSlides = effectiveSegmentSlides[quizSegmentIndex]`
   - So we use either slides from `GET /api/segment-slides` (PDF-derived) or the demo module’s `segmentSlides` (array of strings, one per segment).

2. **If there is slide text for this segment** (`if (segmentSlides)`):
   - **Try AI path:**  
     `POST /api/generate-segment-flashcards` with:
     - `segmentIndex`: current segment index (number)
     - `segmentSlides`: full slide text for that segment (string)
     - `count`: 6
   - **Success path:**  
     If `res.ok` and `data.flashcards` is a non-empty array → set those cards, close quiz, open flashcard modal, **return** (no fallback).
   - **Any other case** (network error, non-ok response, or empty/wrong `data.flashcards`) → **fallback**: no error is shown; we jump to the static path below.

3. **Fallback path (when AI is not used or fails):**
   - `cards = getSegmentFlashcards(quizSegmentIndex)` from `data/segmentFlashcards.ts` (hardcoded `segmentFlashcards` per segment).
   - If that’s empty: `aiHelpService.getFlashcards(quizSegmentIndex)` (generic stub cards from `lib/ai-help.ts`).
   - Then we set those cards and open the same flashcard modal.

So: **whenever the AI path doesn’t return a successful response with a non-empty `flashcards` array, the UI silently uses the fallback file.** The user never sees *why* the AI path failed.

---

### 3. API route (server)

**File:** `app/api/generate-segment-flashcards/route.ts`  
**Method:** `POST`

- Reads body: `segmentIndex`, `segmentSlides`, `count`.
- Validates:
  - `segmentIndex` must be a number ≥ 0.
  - `segmentSlides` must be a non-empty string (after trim).
- Calls `generateSegmentFlashcards(segmentIndex, segmentSlides.trim(), count)` from `lib/gemini-ai.ts`.
- On success: returns `{ flashcards }` (array of `{ front, back }`).
- On any thrown error: catches, logs “Segment flashcards generation failed”, returns **500** with `{ error: message }` (message from the thrown error). The client then sees `res.ok === false` and falls back without showing that error.

---

### 4. AI implementation (Gemini)

**File:** `lib/gemini-ai.ts`

- **API key**
  - `getGeminiKey()` returns `process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''`.
  - Used only on the **server** (API route runs in Node). So `.env.local` in the **project root** must define one of these; the key in `content-engine-demo/.env.local` is **not** used by the main app’s API routes.

- **Model**
  - URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=...`
  - If the model name is wrong or deprecated (e.g. Google renames to `gemini-2.5-flash`), the API can return 404 or 400 and the route returns 500 → fallback.

- **`generateSegmentFlashcards(segmentIndex, segmentSlides, count)`**
  - Truncates `segmentSlides` to `MAX_SLIDES_CHARS` (4000) if needed.
  - Builds a prompt: “Return ONLY a valid JSON array … Each object: front, back.”
  - Calls `callGemini(prompt, 1500)`.
  - **Response handling:**
    - Takes raw text from `data.candidates?.[0]?.content?.parts?.[0]?.text`.
    - Cleans: strip ```json and ```, trim.
    - `JSON.parse(cleaned)` → if this throws (e.g. Gemini added prose, or returned “Here is the JSON: [...]”), the function throws → API returns 500 → fallback.
  - If parse succeeds but result is not an array, throws “Invalid format” → 500 → fallback.
  - Otherwise returns up to `count` cards with `front`/`back` (empty string if missing).

So **any** of the following on the server will cause “AI failed” and trigger fallback on the client:

- Missing or wrong API key (e.g. only in `content-engine-demo/.env.local`).
- Wrong or deprecated model name (e.g. `gemini-2.0-flash` no longer valid).
- Gemini returning non-JSON or malformed JSON (parse error).
- Gemini returning empty array or non-array (invalid format).
- Network/rate-limit/5xx from Gemini (all surface as 500 from our API).

---

### 5. Fallback data

**File:** `data/segmentFlashcards.ts`

- `segmentFlashcards`: record keyed by segment index (0, 1, 2) with arrays of `{ front, back }` (fixed C/security content).
- `getSegmentFlashcards(segmentIndex)` returns that array or `[]` for unknown index.

This is what you see when the AI path doesn’t succeed.

---

## Why it “failed” — possible causes (and how to confirm)

Because the client **does not** show or log the API error, “it failed” could be any of the following.

| # | Cause | How it manifests | How to confirm |
|---|--------|-------------------|------------------|
| 1 | **API key not available on server** | `getGeminiKey()` returns `''` → `callGemini` throws “Gemini is not configured…” → 500. | Ensure `GEMINI_API_KEY` or `NEXT_PUBLIC_GEMINI_API_KEY` is in the **root** `.env.local` (not only in `content-engine-demo/`). Restart dev server after changing `.env.local`. |
| 2 | **Wrong or deprecated model name** | Gemini returns 404/400 → `callGemini` throws “Gemini error: …” → 500. | Check Google’s current model IDs (e.g. `gemini-2.5-flash`) and update the URL in `lib/gemini-ai.ts` if needed. |
| 3 | **Gemini returns non-JSON or malformed JSON** | `JSON.parse(cleaned)` throws in `generateSegmentFlashcards` → 500. | Server log: “Failed to parse Gemini flashcards response” with `preview` of `cleaned`. Improve prompt or add robust extraction (e.g. take first `[...]` from the response). |
| 4 | **Gemini returns empty array or non-array** | “Invalid format” thrown → 500. | Same as above; check server logs and optionally relax validation or retry with a clearer prompt. |
| 5 | **Rate limit (429) or Gemini 5xx** | `callGemini` throws → 500. | Server log: “Gemini API error” with status and body. Client sees 500 and falls back. |
| 6 | **Network / timeout** | Request to Gemini fails or times out (e.g. 60s) → 500. | Server log of the thrown error; client may see failed fetch and hit catch → fallback. |
| 7 | **Client never called the API** | `effectiveSegmentSlides[quizSegmentIndex]` is undefined or empty. | Then we never `fetch`; we go straight to `getSegmentFlashcards`. Check that segment slides are loaded (e.g. from `/api/segment-slides` or `demoModule.segmentSlides`) and that the current segment index has a slide string. |

---

## Summary

- **Intended design:** Click “Show flashcards” → call `POST /api/generate-segment-flashcards` with segment slides → Gemini returns JSON array of `{ front, back }` → show those. If anything in that chain fails, the app **silently** uses the static `data/segmentFlashcards.ts` (or the generic `aiHelpService` stub).
- **Why you see fallback:** One of the causes above happens (key, model, parse, rate limit, network, or no slides), the API returns 500 or the client gets an error/empty data, and the empty `catch { }` and lack of error UI hide the real reason.
- **Next step:** Surface the API error on the client (e.g. read `res.json()` when `!res.ok`, log and/or show “AI generation failed: …”) and fix the most likely cause (key in root `.env.local`, model name, or more robust JSON parsing) based on what you see.
