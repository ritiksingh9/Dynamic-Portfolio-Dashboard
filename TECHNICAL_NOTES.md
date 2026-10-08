# Technical notes: portfolio dashboard

## Challenges and solutions

### Unofficial finance data sources

Yahoo Finance and Google Finance do not offer supported public APIs for this use case. Scraping their pages or depending on undocumented endpoints can break without notice, and repeated requests may be throttled. This implementation uses Yahoo's unofficial chart endpoint for current prices and clearly identifies local reference prices whenever a quote cannot be retrieved. P/E and latest-earnings values remain the local workbook snapshot; they are not labelled as live Google Finance data. A production deployment should use a licensed market-data API with documented rate limits and fundamentals coverage.

### Protecting portfolio information

The original workbook contains holding names, quantities, purchase prices, and values, so it is treated as private financial data. The real portfolio is stored in `data/portfolio.private.json`, which is excluded by `.gitignore`; workbook files are ignored too. The tracked portfolio contains only a small demo set. If the private file is missing, the API uses that demo set and the dashboard labels it accordingly. Public deployments therefore do not include the actual portfolio.

### Rate limits and request volume

The browser refreshes at the requested 15-second interval. The server bounds concurrent Yahoo requests and caches successful quotes for 15 seconds so simultaneous refreshes do not duplicate the same symbol request. For a larger user base, move this cache to a shared service and refresh market data on a server-side schedule.

### Incomplete and inconsistent workbook data

The workbook contains a missing P/E and earnings figure for Savani Financials, an unavailable P/E for SBI Life, and numeric BSE codes for several holdings. Missing financial metrics display as an em dash instead of a misleading zero. Exchange codes are kept as provided; separate Yahoo symbols are used to request prices.

### Calculations and data transformations

For each holding, investment is `purchase price × quantity`, present value is `CMP × quantity`, gain/loss is `present value − investment`, and portfolio weight is the holding's investment divided by total investment. Sector summaries use the same underlying holding values to avoid inconsistent totals.

### Failures and accuracy

Each failed quote is logged server-side and the response includes a visible warning; the affected stock uses its local reference CMP. If the dashboard request itself fails, the UI retains its last successful response and displays an error. Prices and ratios should be checked against a broker or verified data provider before use.

## Verification before release

- Install dependencies and run `npm run build`.
- Verify that Yahoo data is reachable from the target hosting region and confirm ticker mappings.
- Compare workbook totals and selected quotes with the source workbook/broker.
- If live P/E and earnings are required, integrate a documented, licensed fundamentals provider instead of scraping Google Finance.
