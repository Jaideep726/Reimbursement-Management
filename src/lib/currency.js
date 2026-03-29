const EXCHANGE_RATE_API = 'https://v6.exchangerate-api.com/v6'
const COUNTRIES_API = 'https://restcountries.com/v3.1/all?fields=name,currencies'
const CACHE_KEY = 'reim_countries_cache'
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

export async function fetchCountriesWithCurrencies() {
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

    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
    return data
  } catch {
    console.warn('restcountries API unavailable, using fallback currency list')
    return FALLBACK_CURRENCIES
  }
}

export async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return parseFloat(amount)

  try {
    const key = import.meta.env.VITE_EXCHANGE_RATE_KEY
    const res = await fetch(`${EXCHANGE_RATE_API}/${key}/latest/${fromCurrency}`)
    if (!res.ok) throw new Error(`Exchange rate API error: ${res.status}`)
    const data = await res.json()

    const rate = data.conversion_rates[toCurrency]
    if (rate == null) throw new Error(`No rate for ${toCurrency}`)
    return parseFloat((amount * rate).toFixed(2))
  } catch (err) {
    console.error('Currency conversion failed:', err)
    throw new Error(`Could not convert ${fromCurrency} to ${toCurrency}. Check your connection.`)
  }
}

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