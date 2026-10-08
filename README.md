# Northstar portfolio dashboard

A responsive Next.js, React, TypeScript and Tailwind dashboard. This workspace loads your 29 holdings from a local private data file; a clean/public clone uses a small demo portfolio instead.

## What it does

- Groups holdings by sector and shows sector-level summaries.
- Calculates investment, portfolio weight, present value, gain/loss and returns from purchase price, quantity and current price.
- Refreshes the portfolio from the browser every 15 seconds.
- Requests current prices from Yahoo Finance on the server; failed requests fall back to local reference prices and are labelled **REF**.
- Displays the P/E and latest-earnings figures in the local portfolio data.
- Supports searching, sector filtering, sorting, and responsive layouts.
- Keeps market-data requests on the server rather than exposing an upstream data URL in the browser.
- Keeps actual positions out of GitHub by ignoring the private holdings file and the supplied workbook.

> **Market-data note:** Yahoo Finance and Google Finance do not provide supported public APIs for this use. The Yahoo chart endpoint used here is unofficial and can change, throttle, or block requests. P/E and latest-earnings values are the figures in the local portfolio data; they are not represented as live Google Finance data. Check important prices and fundamentals with your broker or a licensed provider.

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

The dashboard refreshes every 15 seconds. The server limits parallel price requests and caches successful Yahoo quotes for the same interval to reduce duplicate calls. Fundamentals remain the supplied workbook snapshot until replaced with a supported, licensed data provider.
