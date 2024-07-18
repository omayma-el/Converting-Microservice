import express, { Request, Response } from 'express';
import axios from 'axios'; // Import axios
import { format, subDays } from 'date-fns';
import cors from 'cors';

const app = express();
const port = 3002;

// Calculate yesterday's date
const yesterday = subDays(new Date(), 1);
const START_DATE = format(yesterday, 'yyyy-MM-dd');

// Middleware to parse JSON in POST requests
app.use(express.json());

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3001', // Replace with your front-end URL
  methods: ['POST'],
  allowedHeaders: ['Content-Type'],
}));

// POST /calculation endpoint
app.post('/calculation', async (req: Request, res: Response) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing required fields in request body: "from_currency", "to_currency", "amount"' });
  }


  try {
    // Make a GET request to the /exchange-rate endpoint
    const fromResponse = await axios.get('http://localhost:3003/exchange-rate-cache', {
      params: {
        from
      }
    });

    const toResponse = await axios.get('http://localhost:3003/exchange-rate-cache', {
      params: {
        from : to
      }
    });

    const rate_from = fromResponse.data.rate;
    const rate_to = toResponse.data.rate;

    // Ensure rates are valid numbers
    if (rate_from === 0 || rate_to === 0) {
      return res.status(400).json({ error: 'Invalid exchange rate received' });
    }


    const rate_ratio = rate_to / rate_from;

    // Calculate the converted amount
    const convertedAmount = amount * rate_ratio;

    // Respond with the conversion result
    return res.json({
      from,
      to,
      amount,
      convertedAmount,
      exchangeRate: rate_ratio
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
