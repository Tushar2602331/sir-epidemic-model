# Epidemic Expert — SIR & SEIR Lab

An interactive Engineering Mathematics project for exploring SIR and SEIR epidemic models. It includes an RK4 numerical solver, live differential-equation analysis, scenario comparison, MATLAB code generation, and historical-data validation.

## Requirements

- Node.js 20 LTS or newer
- npm 10 or newer

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Verify before release

```bash
npm test
npm run build
```

`npm run build` produces the static production site in `dist/`. There is no server, database, secret, or environment-variable dependency.

## Deploy to Vercel

This repository is ready to deploy as a Vite static site.

1. Push the repository to GitHub.
2. In [Vercel](https://vercel.com/new), choose **Add New → Project** and import the GitHub repository.
3. Keep the detected settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. Do not add environment variables.
5. Select **Deploy**.

Vercel will automatically create preview deployments for pull requests and production deployments for pushes to the selected production branch. The included `vercel.json` locks the build and output settings so a fresh import is deterministic.

## Deploy from the Vercel CLI (optional)

```bash
npx vercel
```

Follow the prompts, then use `npx vercel --prod` when you are ready to publish a production deployment.
