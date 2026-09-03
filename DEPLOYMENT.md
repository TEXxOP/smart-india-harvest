# Deploying the backend to Render

The mobile app no longer needs a LAN IP — [`mobile-app/src/config.ts`](mobile-app/src/config.ts)
points at the deployed URL by default.

## One-time setup

1. Commit the model artifacts. They are **not** gitignored, and the build fails
   without them:

   ```bash
   git add -f backend/crop_recommendation_model.joblib backend/yield_model/ backend/disease_model/
   ```

2. Push to GitHub, then in Render: **New +** → **Blueprint** → pick this repo.
   [`render.yaml`](render.yaml) is read automatically.

3. Render prompts for the two secrets (declared `sync: false`, never committed):

   | Variable | Where to get it |
   |---|---|
   | `DATABASE_URL` | Neon / Supabase / Render Postgres connection string |
   | `GROQ_API_KEY` | https://console.groq.com/keys |

4. After the first deploy, copy the real service URL from the Render dashboard
   into `DEPLOYED_BACKEND_URL` in `mobile-app/src/config.ts`. Render appends a
   random suffix when a service name is already taken globally, so the host is
   not guaranteed to be `smart-india-harvest-api.onrender.com`.

5. Verify:

   ```bash
   curl https://<your-service>.onrender.com/api/health
   ```

   Expect `crop_recommender_loaded` and `yield_model_loaded` to be `true`.
   `disease_model_loaded` is `false` until the first `/api/detect-disease` call —
   that is by design, see below.

## What was changed for deployment

| Change | Why |
|---|---|
| Disease ViT runs on **ONNX Runtime**, not torch + transformers | Those two imports alone cost ~225 MB RSS and pushed the service to ~505 MB against the 512 MB ceiling. The exported graph is 22 MB and onnxruntime adds ~56 MB, so the whole service now peaks at ~316 MB |
| `backend/disease_model/` committed (`model.onnx` + `preprocess.json`) | Weights are read from disk, so a cold start needs no network and cannot be broken by a HuggingFace outage or rate limit |
| `.python-version` = `3.10` | New Render services now default to Python 3.14, which has no wheels for these pins |
| ViT session opens lazily | Only ~56 MB, but it keeps boot at 246 MB and the first-request cost is now 0.4 s rather than 9 s |
| Disease load + inference in a threadpool | Blocking work on the event loop would stall `/api/health` and get the instance marked unhealthy |
| `prefetch_models.py` in `buildCommand` | Fails the build loudly if any artifact is missing, unloadable, or (for the ONNX graph) not runnable |
| `pool_pre_ping` / `pool_recycle` on the engine | Neon drops idle connections and a free instance sleeps; without this the first query after waking fails with "server closed the connection unexpectedly" |
| `SQL_ECHO` env-gated (was `echo=True`) | Was logging every statement and its row values |
| `deep-translator` dropped | Not imported anywhere in the backend; only lengthened builds |
| sklearn `InconsistentVersionWarning` suppressed | ~30 lines of warnings per cold start; see the caveat below |

## Measured footprint

Taken on Windows with `psutil`; Linux is typically somewhat lower.

| Stage | RSS | Previously (torch) |
|---|---|---|
| Boot (sklearn + both joblib models) | **246 MB** | 246 MB |
| After ONNX session opens | **301 MB** | 500 MB |
| Steady state serving disease requests | **~316 MB** | ~505 MB |

All 13 endpoints now fit the 512 MB free instance with roughly 195 MB of
headroom. Inference is ~37 ms per image on one thread, and the first
`/api/detect-disease` after a cold start returns in ~0.6 s end to end (it was
8.8 s when transformers had to be imported).

`backend/export_disease_onnx.py` regenerates the ONNX file and verifies it
against the torch model; `backend/verify_onnx_parity.py` checks that the numpy
preprocessing reproduces `ViTImageProcessor`. Both need torch and transformers,
so they run on a dev machine only — neither is installed on Render. Last run:
pixel deviation 1.2e-07, top-5 labels and scores identical to four decimals
across four image shapes.

## Why not call the ViT from HuggingFace instead

Checked, and it does not hold up:

- **Serverless Inference API:** `wambugu71/crop_leaf_diseases_vit` has an empty
  `inferenceProviderMapping`, i.e. no provider serves it. The router returns
  401 and the legacy `api-inference.huggingface.co` host is retired.
- **Someone else's Space:** 41 Spaces reference the model. Two are running, and
  one of those is a `static` Space that cannot run Python. Sixteen are in
  `RUNTIME_ERROR` / `BUILD_ERROR` / `CONFIG_ERROR`, including the model author's
  own demo. Not a dependency to build a demo on.
- **Your own Space:** Gradio and Docker Spaces now require a paid plan to create
  (PRO for personal accounts). The free exception is up to 2 **ZeroGPU** Gradio
  Spaces, which are capped at 5 GPU-minutes/day on a free account.

It would also add a second cold start in front of Render's, and send farmer leaf
photos to a third party. ONNX keeps everything in one service.

## Free-tier behaviour worth knowing

- The instance sleeps after 15 minutes idle. The next request takes ~30–60 s
  while it cold-starts, plus ~0.4 s more if it is the first disease request.
- 0.1 CPU. ONNX inference measured 37 ms locally on one thread; expect a few
  hundred milliseconds to a second or two there.
- No fetch in `mobile-app/src/services/` sets a timeout, so a cold start leaves
  requests hanging on the platform default. `BACKEND_TIMEOUT_MS` is exported
  from `config.ts` for this but is not wired up yet.

## Known caveat: sklearn pickle versions

The committed models were pickled by different scikit-learn versions than the
pinned 1.7.2 — the crop recommender by 1.4.2, the yield model by 1.8.0. Both were
verified to load and predict correctly under 1.7.2 (crop recommender returns rice
at p=0.948 for the canonical rice soil profile; yield model reports its expected
15 features and a sane `log1p` output). The warnings are suppressed rather than
fixed. Re-pickling both under one version is the proper remedy, and
`scikit-learn` should not be bumped without re-verifying both models.

## Local development

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL and GROQ_API_KEY
venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000
```

To point the app at it, set `USE_LOCAL_BACKEND = true` in
`mobile-app/src/config.ts` (and update `LOCAL_BACKEND_IP`), or set
`EXPO_PUBLIC_BACKEND_URL`, which overrides everything.

### Re-exporting the disease model

Only needed if `DISEASE_MODEL_ID` changes. Requires `torch` and `transformers`,
which are **not** in `requirements.txt` — install them into the dev venv only:

```bash
cd backend && venv/Scripts/python.exe export_disease_onnx.py && venv/Scripts/python.exe verify_onnx_parity.py
```

The first script writes `disease_model/` and checks the ONNX logits against
torch; the second checks that `_preprocess_leaf_image` still matches
`ViTImageProcessor`. Commit `disease_model/` afterwards.
