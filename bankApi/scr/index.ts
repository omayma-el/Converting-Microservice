import express, { Request, Response } from 'express';
import axios from 'axios';
import { Parser } from 'xml2js';
import { format, subDays } from 'date-fns';

const app = express();
const port = 3000;

// Calculate yesterday's date
const yesterday = subDays(new Date(), 1);
const START_DATE = format(yesterday, 'yyyy-MM-dd');

// Configure the xml2js parser
const parser = new Parser({ explicitArray: false });

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

// Middleware to parse JSON in POST requests
app.use(express.json());

// GET /exchange-rate endpoint
app.get('/exchange-rate', async (req: Request, res: Response) => {
  const { from } = req.query;

  if (!from) {
    return res.status(400).json({ error: 'Currency code "from" is required as a query parameter' });
  }

  try {
    // Get the exchange rate value from the external API
    const rate = await fetchObsValue(from as string);

    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    // Respond with the exchange rate value
    return res.json({
      from: from,
      to: 'EUR', // EUR is the value of 'to' in the external API request
      rate: rate
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return res.status(500).send('Error fetching exchange rate');
  }
});

// POST /convert endpoint
app.post('/convert', async (req: Request, res: Response) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing required fields in request body: "from", "to", "amount"' });
  }

  try {
    // Get the exchange rate value from the external API (only 'from' is needed)
    const rate = await fetchObsValue(from);

    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    const convertedAmount = amount * rate;

    // Respond with the conversion result
    return res.json({
      from,
      to,
      amount,
      convertedAmount,
      exchangeRate: rate
    });

  } catch (error) {
    console.error('Error converting currency:', error);
    return res.status(500).send('Error converting currency');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
