import express, { Request, Response } from 'express';
import axios from 'axios';
import { Parser } from 'xml2js';
import { format, subDays } from 'date-fns';
import cors from 'cors'; // Import CORS middleware

const app = express();
const port = 3005;

// Calculate yesterday's date
const yesterday = subDays(new Date(), 1);
const START_DATE = format(yesterday, 'yyyy-MM-dd');

// Configure the xml2js parser
const parser = new Parser({ explicitArray: false });

// List of acronyms
const acronyms = [
  "AUD",
  "BRL",
  "BGN",
  "CAD",
  "CNY",
  "CZK",
  "DKK",
  "HKD",
  "HUF",
  "ISK",
  "INR",
  "IDR",
  "ILS",
  "JPY",
  "KRW",
  "MYR",
  "MXN",
  "NZD",
  "NOK",
  "PHP",
  "PLN",
  "RON",
  "SGD",
  "ZAR",
  "CHF",
  "THB",
  "TRY",
  "GBP",
  "USD"
];

// Function to get the exchange rate from the ECB API
async function fetchObsValue(currencyCode: string): Promise<number | undefined> {
  try {
    const response = await axios.get(`https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.${currencyCode}.EUR.SP00.A`, {
      params: {
        startPeriod: START_DATE
      },
      headers: {
        'Accept': 'application/xml'
      }
    });

    console.log('API response:', response.data); // Show the external API response in the console

    const result = await parser.parseStringPromise(response.data);
    
    // Extract the most recent value from generic:Obs > generic:ObsValue
    const series = result['message:GenericData']['message:DataSet']['generic:Series'];
    const observations = series['generic:Obs'];
    const mostRecentObs = Array.isArray(observations) ? observations[observations.length - 1] : observations;
    const obsValue = mostRecentObs['generic:ObsValue']['$']['value'];

    return parseFloat(obsValue);
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return undefined;
  }
}

// Function to get exchange rates for all acronyms
async function fetchAllRates(): Promise<{ key: string, value: string }[]> {
  const rates = await Promise.all(acronyms.map(async (acronym) => {
    const rate = await fetchObsValue(acronym);
    return {
      key: acronym,
      value: rate !== undefined ? rate.toString() : "N/A"
    };
  }));

  return rates;
}

// Middleware to parse JSON in POST requests
app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3002', // Replace with your Calculation Service URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));


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
