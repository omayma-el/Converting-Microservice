import express, { Request, Response } from 'express';
import Memcached from 'memcached';
import cors from 'cors';

const app = express();
const port = 3004;

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
    origin: 'http://localhost:3005/',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));


// POST /cache endpoint
app.post('/cache', (req: Request, res: Response) => {
  const keyValuePairs = req.body;

  // Check that keyValuePairs is an array and that each element has a key and a value
  if (!Array.isArray(keyValuePairs) || !keyValuePairs.every(pair => typeof pair.key === 'string' && typeof pair.value !== 'undefined')) {
    return res.status(400).json({ error: 'Request body should be an array of key-value pairs with "key" and "value" properties' });
  }

  const operations = keyValuePairs.map(({ key, value }) => {
    return new Promise<void>((resolve, reject) => {
      memcached.set(key, value, 86400, (err) => { // 86 400 seconds = 24 hours
        if (err) {
          console.error(`Error setting cache for key ${key}:`, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });

  Promise.all(operations)
    .then(() => res.status(200).send('All key-value pairs stored in cache'))
    .catch(error => {
      console.error('Error storing key-value pairs in cache:', error);
      return res.status(500).json({ error: 'Error storing key-value pairs in cache', details: error });
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
