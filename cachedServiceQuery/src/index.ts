import express, { Request, Response } from 'express';
import Memcached from 'memcached';
import cors from 'cors';

const app = express();
const port = 3003;

// Initialize Memcached
const memcached = new Memcached('localhost:11211');

// Middleware to parse JSON in POST requests
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:11211/',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));

  app.use(cors({
    origin: 'http://localhost:3002/',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));

// GET /exchange-rate-cache endpoint
app.get('/exchange-rate-cache', (req: Request, res: Response) => {
  const { from } = req.query;

  if (!from) {
    return res.status(400).json({ error: 'Currency code "from" is required as a query parameter' });
  }

  const cacheKey = from as string;

  memcached.get(cacheKey, (err, data) => {
    if (err) {
      console.error('Error fetching from cache:', err);
      return res.status(500).json({ error: 'Error fetching from cache' });
    }

    if (data) {
      return res.json({
        from: from,
        to: 'EUR',
        rate: data
      });
    } else {
      return res.status(404).json({ error: 'Exchange rate not found in cache' });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
