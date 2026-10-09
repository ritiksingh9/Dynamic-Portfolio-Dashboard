# 8Byte Capital Portfolio

A responsive Next.js, React, TypeScript and Tailwind dashboard. This workspace loads your 29 holdings from a local private data file; a clean/public clone uses a small demo portfolio instead.

## What it does

- Groups holdings by sector and shows sector-level summaries.
- Calculates investment, portfolio weight, present value, gain/loss and returns from purchase price, quantity and current price.
- Refreshes the portfolio from the browser every 15 seconds.
- Requests current prices from Yahoo Finance on the server; failed requests fall back to local reference prices and are labelled **REF**. The LTIMindtree ticker rename is mapped to Yahoo's current `LTM.NS` symbol.
- Scrapes the publicly rendered Google Finance quote page on the server for P/E and EPS. These values are unofficial and cached for six hours; unavailable metrics fall back to the supplied workbook values and are labelled **FILE**.
- Supports searching, sector filtering, sorting, and responsive layouts.
- Keeps market-data requests on the server rather than exposing an upstream data URL in the browser.
- Keeps actual positions out of GitHub by ignoring the private holdings file and the supplied workbook.

> **Market-data note:** Yahoo Finance and Google Finance do not provide supported public APIs for this use. The Yahoo chart endpoint and Google Finance page scraping are unofficial and can change, throttle, or block requests. Google Finance's `EPS` metric is shown in the “Latest earnings (EPS / share)” column because it is a per-share earnings metric; it is not total or quarterly company earnings. Missing values fall back to the supplied workbook snapshot, whose earnings figure may use a different period or definition. Check important prices and fundamentals with your broker or a licensed provider.

## Run locally

1. Install Node.js 20 LTS or later.
2. Open a terminal in this project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

Create a production build with `npm run build`, then run it with `npm start`.

## Portfolio data and privacy

This workspace has a local `data/portfolio.private.json` with the holdings from the supplied workbook. It is ignored by Git. The Excel workbook is also ignored. The API validates the private file before using it; if the file is absent, the app displays demo data from [`src/data/portfolio.ts`](./src/data/portfolio.ts). The dashboard labels the active mode as **Private portfolio** or **Demo data**.

Do not force-add the workbook or private JSON file to a public repository. A public GitHub/Vercel deployment will use demo data unless you deliberately set up a private, access-controlled data source. Hosting your real holdings with a third party can disclose sensitive financial information.

## Deploy to Vercel

1. Push the sanitized project to a GitHub repository. Confirm `data/portfolio.private.json` and the Excel workbook are not staged.
2. Sign in to Vercel and choose **Add New → Project**.
3. Import the repository. Vercel detects Next.js automatically; keep the default build command (`next build`) and output settings.
4. Deploy, then open the generated URL. It will show the demo dataset until you configure a suitable private data source.

The app needs no API keys to start. The Yahoo endpoint may still be rate-limited or unavailable depending on the deployment region.

## Data and calculations

Update `data/portfolio.private.json` in this workspace to change your private holdings. For a public sample/demo, edit [`src/data/portfolio.ts`](./src/data/portfolio.ts). The server endpoint at [`app/api/portfolio/route.ts`](./app/api/portfolio/route.ts) refreshes prices and calculates derived portfolio values.

The dashboard refreshes every 15 seconds. The server limits concurrent quote requests, caches Yahoo quotes for 15 seconds, and caches successful Google Finance fundamentals for six hours to reduce scraping and avoid unnecessary upstream traffic. Google Finance metrics that are unavailable use the supplied workbook value when available. For production, replace unofficial endpoints and scraping with a licensed provider.
