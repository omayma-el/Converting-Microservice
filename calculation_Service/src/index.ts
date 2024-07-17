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
    return res.status(400).json({ error: 'Missing required fields in request body: "from", "to", "amount"' });
  }

  try {
    // Make a GET request to the /exchange-rate endpoint
    const exchangeRateResponse = await axios.get('http://localhost:3000/exchange-rate', {
      params: {
        from
      }
    });

    // Check if exchangeRateResponse contains data
    if (!exchangeRateResponse || !exchangeRateResponse.data) {
      console.error('Exchange rate response missing data');
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    const { rate } = exchangeRateResponse.data;

    // Calculate the converted amount
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
