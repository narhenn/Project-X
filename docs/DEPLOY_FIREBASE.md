# Firebase deploy – make API & OpenAI work

The app is at **https://ntulearn-cd226.web.app**. If the **quiz** or **“I’m lost”** features don’t work (e.g. “Failed to generate quiz”), the Cloud Function that runs your API routes doesn’t have the **OpenAI API key**.

## Fix: set env vars on the deployed function (do this once)

Your API runs in a **Cloud Function** (2nd gen), which is backed by **Cloud Run**. Add the keys there.

### Option A – Google Cloud Console (easiest)

1. Open **Cloud Run**:  
   [https://console.cloud.google.com/run?project=ntulearn-cd226](https://console.cloud.google.com/run?project=ntulearn-cd226)
2. Click the **service** that runs your app (name like **`ssrntulearncd226`**).
3. Click **“Edit & deploy new revision”** (top).
4. Open the **“Variables & secrets”** tab.
5. Under **“Environment variables”**, add:
   - **Name:** `OPENAI_API_KEY`  
     **Value:** your OpenAI API key (from [OpenAI API keys](https://platform.openai.com/api-keys)).
   - (Optional) **Name:** `OPENAI_API_KEY_2`  
     **Value:** a second key (for rate-limit rotation).
6. Click **“Deploy”** and wait for the new revision.

After the new revision is live, reload **https://ntulearn-cd226.web.app** and try the quiz again.

### Option B – gcloud CLI

If you use `gcloud` and want to avoid the console:

```bash
gcloud run services update ssrntulearncd226 \
  --region=us-central1 \
  --project=ntulearn-cd226 \
  --set-env-vars="OPENAI_API_KEY=YOUR_KEY_HERE"
```

Replace `YOUR_KEY_HERE` with your OpenAI API key. For a second key:

```bash
--set-env-vars="OPENAI_API_KEY=key1,OPENAI_API_KEY_2=key2"
```

---

## Future deploys: keep keys available

When you run `firebase deploy`, the CLI loads **`.env`** from the **project root** (it does **not** load `.env.local`). So either:

- **Before each deploy:** copy your keys into a **`.env`** in the project root (same vars as in `.env.example`), or  
- Rely on **Option A** above: set the env vars once in Cloud Run; they persist until you change or remove them. New deploys keep using the same revision’s env vars unless you edit the service again.

**Do not commit `.env`** if it contains real keys. Add `.env` to `.gitignore` (see below).

---

## Summary

| Step | Action |
|------|--------|
| 1 | Cloud Run → service `ssrntulearncd226` → Edit & deploy new revision |
| 2 | Variables & secrets → add `OPENAI_API_KEY` (and optionally `OPENAI_API_KEY_2`) |
| 3 | Deploy the new revision |
| 4 | Test quiz at https://ntulearn-cd226.web.app |

Once those env vars are set, the API and OpenAI (quiz, “I’m lost”, etc.) work on the same link.
