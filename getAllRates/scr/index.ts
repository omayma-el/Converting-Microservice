import express, { Request, Response } from 'express';
import axios from 'axios';
import { Parser } from 'xml2js';
import { format, subDays } from 'date-fns';
import cors from 'cors';

const app = express();
const port = 3005;

// Initialize Memcached

// Calculate yesterday's date
const yesterday = subDays(new Date(), 1);
const START_DATE = format(yesterday, 'yyyy-MM-dd');

// Configure the xml2js parser
const parser = new Parser({ explicitArray: false });

// List of acronyms
const acronyms = [
  "AUD", "BRL", "BGN", "CAD", "CNY", "CZK", "DKK", "HKD", "HUF", "ISK", 
  "INR", "IDR", "ILS", "JPY", "KRW", "MYR", "MXN", "NZD", "NOK", "PHP", 
  "PLN", "RON", "SGD", "ZAR", "CHF", "THB", "TRY", "GBP", "USD"
];

// Function to get the exchange rate from the ECB API
async function fetchObsValue(currencyCode: string): Promise<number | undefined> {
  try {
    const response = await axios.get(`https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.${currencyCode}.EUR.SP00.A`, {
      params: { startPeriod: START_DATE },
      headers: { 'Accept': 'application/xml' }
    });

    const result = await parser.parseStringPromise(response.data);
    const series = result['message:GenericData']['message:DataSet']['generic:Series'];
    const observations = series['generic:Obs'];
    const mostRecentObs = Array.isArray(observations) ? observations[observations.length - 1] : observations;
    const obsValue = mostRecentObs['generic:ObsValue']['$']['value'];

    return parseFloat(obsValue);
  } catch (error) {
    console.error(`Error fetching exchange rate for ${currencyCode}:`, error);
    return undefined;
  }
}

// Function to get exchange rates for all acronyms
async function fetchAllRates(): Promise<{ key: string, value: string }[]> {
  const rates = await Promise.all(acronyms.map(async (acronym) => {
    const rate = await fetchObsValue(acronym);
    return { key: acronym, value: rate !== undefined ? rate.toString() : "N/A" };
  }));

  return rates;
}

// Middleware to parse JSON in POST requests
app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3002',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Endpoint to store rates in Memcached using the /cache API
app.post('/store-rates-in-cache', async (_req: Request, res: Response) => {
  try {
    const rates = await fetchAllRates();
    const keyValuePairs = rates.map(rate => ({ key: rate.key, value: rate.value }));

    // Call the /cache API to store in Memcached
    const response = await axios.post('http://localhost:3004/cache', keyValuePairs);

    console.log('Rates stored in cache successfully:', response.data);
    return res.status(200).json({ message: 'Rates stored in cache successfully' });
  } catch (error) {
    console.error('Error storing rates in cache:', error);
    return res.status(500).json({ error: 'Error storing rates in cache', details: error });
  }
});

// Function to periodically fetch and store rates in cache every 6 hours
async function storeRatesInCachePeriodically() {
  try {
    // Initially fetch and store rates
    await storeRatesInCache();

    // Set interval to run every 6 hours (in milliseconds: 6 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    setInterval(async () => {
      await storeRatesInCache();
    }, 6 * 60 * 60 * 1000);
  } catch (error) {
    console.error('Error storing rates in cache periodically:', error);
  }
}

// Function to fetch rates and store in Memcached
async function storeRatesInCache() {
  try {
    const rates = await fetchAllRates();
    const keyValuePairs = rates.map(rate => ({ key: rate.key, value: rate.value }));

    // Call the /cache API to store in Memcached
    const response = await axios.post('http://localhost:3004/cache', keyValuePairs);

    console.log('Rates stored in cache successfully:', response.data);
  } catch (error) {
    console.error('Error storing rates in cache:', error);
  }
}

// Start periodic storing of rates in cache
storeRatesInCachePeriodically();

// GET /all-exchange-rates endpoint
app.get('/all-exchange-rates', async (_req: Request, res: Response) => {
  try {
    const rates = await fetchAllRates();
    return res.json(rates);
  } catch (error) {
    console.error('Error fetching all exchange rates:', error);
    return res.status(500).send('Error fetching all exchange rates');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
