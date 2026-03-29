// Frankfurter API — free, no key, maintained by the ECB
// Docs: https://www.frankfurter.app/docs/
const FRANKFURTER_API = 'https://api.frankfurter.app'
const COUNTRIES_API = 'https://restcountries.com/v3.1/all?fields=name,currencies'
const CACHE_KEY = 'reim_countries_cache'
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

// Fetch all countries with their currencies for the signup dropdown.
// Caches in localStorage so the app works even if restcountries is down.
export async function fetchCountriesWithCurrencies() {
  // Return cache if fresh
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) return data
    }
  } catch { /* ignore parse errors */ }

  try {
    const res = await fetch(COUNTRIES_API)
    if (!res.ok) throw new Error('Countries API failed')
    const raw = await res.json()

    const data = raw
      .filter(c => c.currencies && Object.keys(c.currencies).length > 0)
      .map(c => {
        const currencyCode = Object.keys(c.currencies)[0]
        const currencyName = c.currencies[currencyCode].name
        return {
          country: c.name.common,
          currencyCode,
          currencyName,
          label: `${c.name.common} (${currencyCode} — ${currencyName})`,
        }
      })
      .sort((a, b) => a.country.localeCompare(b.country))

    // Cache for offline resilience
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
    return data
  } catch {
    console.warn('restcountries API unavailable, using fallback currency list')
    return FALLBACK_CURRENCIES
  }
}

// Convert amount from one currency to another using Frankfurter API.
// GET /latest?amount=100&from=USD&to=INR
export async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return parseFloat(amount)

  try {
    const res = await fetch(
      `${FRANKFURTER_API}/latest?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`
    )
    if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`)
    const data = await res.json()

    const converted = data.rates[toCurrency]
    if (converted == null) throw new Error(`No rate for ${toCurrency}`)
    return parseFloat(converted.toFixed(2))
  } catch (err) {
    console.error('Currency conversion failed:', err)
    throw new Error(`Could not convert ${fromCurrency} to ${toCurrency}. Check your connection.`)
  }
}

// Fallback list in case restcountries is unreachable during the demo
const FALLBACK_CURRENCIES = [
  { country: 'India', currencyCode: 'INR', currencyName: 'Indian Rupee', label: 'India (INR — Indian Rupee)' },
  { country: 'United States', currencyCode: 'USD', currencyName: 'US Dollar', label: 'United States (USD — US Dollar)' },
  { country: 'United Kingdom', currencyCode: 'GBP', currencyName: 'Pound Sterling', label: 'United Kingdom (GBP — Pound Sterling)' },
  { country: 'European Union', currencyCode: 'EUR', currencyName: 'Euro', label: 'European Union (EUR — Euro)' },
  { country: 'Japan', currencyCode: 'JPY', currencyName: 'Japanese Yen', label: 'Japan (JPY — Japanese Yen)' },
  { country: 'Canada', currencyCode: 'CAD', currencyName: 'Canadian Dollar', label: 'Canada (CAD — Canadian Dollar)' },
  { country: 'Australia', currencyCode: 'AUD', currencyName: 'Australian Dollar', label: 'Australia (AUD — Australian Dollar)' },
  { country: 'Singapore', currencyCode: 'SGD', currencyName: 'Singapore Dollar', label: 'Singapore (SGD — Singapore Dollar)' },
  { country: 'UAE', currencyCode: 'AED', currencyName: 'UAE Dirham', label: 'UAE (AED — UAE Dirham)' },
  { country: 'China', currencyCode: 'CNY', currencyName: 'Chinese Yuan', label: 'China (CNY — Chinese Yuan)' },
]
