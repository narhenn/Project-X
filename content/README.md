# Lecture content for AI-generated quizzes

**Place your lecture slides PDF here** so the AI can read them and generate quiz questions per segment.

## How to use

1. **Add your PDF** to this folder.
   - You can name it **`slides.pdf`** or any name (e.g. **`Lecture 3.pdf`**). The app uses the first `.pdf` file it finds in this folder.
   - The app will extract text from it and use it for AI-generated quiz questions on the watch page.
   - If no PDF is found here, the app falls back to the built-in segment text in `data/demoModule.ts`.

2. **Segment split**  
   The PDF is split into segments by **page**:
   - **Segment 1:** first third of the pages  
   - **Segment 2:** middle third  
   - **Segment 3:** last third  

   So a 15-page PDF becomes roughly pages 1–5, 6–10, 11–15. Make sure your lecture PDF order matches your video segments (e.g. intro → attacks → fixes).

3. **Same module, same segment count**  
   The demo module has 3 segments. The API splits the PDF into 3 parts. If your video has a different number of segments, you can change the segment count in the API or use the built-in text in `demoModule.segmentSlides` instead.

## File location

- Path used by the app: **`content/slides.pdf`** (relative to the project root).
- Do not commit large PDFs if your repo has size limits; add `content/*.pdf` to `.gitignore` and use a local-only PDF if needed.
