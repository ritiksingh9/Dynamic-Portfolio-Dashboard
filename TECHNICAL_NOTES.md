# Technical notes: portfolio dashboard

## Challenges and solutions

### Unofficial finance data sources

Yahoo Finance and Google Finance do not offer supported public APIs for this use case. The app uses Yahoo's unofficial chart endpoint for CMP and scrapes the public Google Finance quote page for P/E and EPS. Yahoo quotes are cached for 15 seconds; Google fundamentals are cached for six hours, with concurrency limits and shorter retries after failures. If a source is unavailable, the dashboard labels Yahoo reference-price or workbook fallback values instead of implying they are live. The Google HTML structure and undocumented Yahoo endpoint may change or block requests; a production deployment should use a licensed market-data API with documented rate limits and fundamentals coverage.

### Protecting portfolio information

The original workbook contains holding names, quantities, purchase prices, and values, so it is treated as private financial data. The real portfolio is stored in `data/portfolio.private.json`, which is excluded by `.gitignore`; workbook files are ignored too. The tracked portfolio contains only a small demo set. If the private file is missing, the API uses that demo set and the dashboard labels it accordingly. Public deployments therefore do not include the actual portfolio.

### Rate limits and request volume

The browser refreshes at the requested 15-second interval. The server bounds concurrent Yahoo requests and caches successful quotes for 15 seconds so simultaneous refreshes do not duplicate the same symbol request. For a larger user base, move this cache to a shared service and refresh market data on a server-side schedule.

### Incomplete and inconsistent workbook data

The workbook contains a missing P/E and earnings figure for Savani Financials, an unavailable P/E for SBI Life, and numeric BSE codes for several holdings. Missing financial metrics display as an em dash instead of a misleading zero. Exchange codes are kept as provided; separate Yahoo symbols are used to request prices.

### Calculations and data transformations

For each holding, investment is `purchase price × quantity`, present value is `CMP × quantity`, gain/loss is `present value − investment`, and portfolio weight is the holding's investment divided by total investment. Sector summaries use the same underlying holding values to avoid inconsistent totals.

### Failures and accuracy

Each failed quote or Google scrape is logged server-side. The response includes visible warnings, and the affected metrics use their local reference/workbook value where available. Per-cell source labels distinguish Google Finance data, workbook values, and unavailable data. The “Latest earnings (EPS / share)” column uses Google Finance's EPS metric, which is earnings per share—not total or quarterly company earnings. Workbook fallbacks may use a different period or definition, so the dashboard labels the source rather than implying the values are directly comparable. If the dashboard request itself fails, the UI retains its last successful response and displays an error. Prices and fundamentals should be checked against a broker or verified data provider before use.

## Verification before release

- Install dependencies and run `npm run build`.
- Verify Yahoo and Google Finance availability from the target hosting region and confirm ticker mappings, especially renamed or delisted securities.
- Compare workbook totals and selected quotes with the source workbook/broker.
- For production, replace unofficial market-data scraping with a documented, licensed fundamentals and quote provider.
