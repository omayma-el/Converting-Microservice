import express, { Request, Response } from 'express';
import axios from 'axios';
import { Parser } from 'xml2js';
import { format, subDays } from 'date-fns';

const app = express();
const port = 3000;

// Calcular la fecha de ayer
const yesterday = subDays(new Date(), 1);
const START_DATE = format(yesterday, 'yyyy-MM-dd');

// Configurar el parser de xml2js
const parser = new Parser({ explicitArray: false });

// Función para obtener la tasa de cambio desde la API del ECB
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

    console.log('API response:', response.data); // Mostrar la respuesta de la API externa en la consola

    const result = await parser.parseStringPromise(response.data);
    
    // Extraer el valor más reciente de generic:Obs > generic:ObsValue
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

// Middleware para parsear JSON en las solicitudes POST
app.use(express.json());

// Endpoint GET /exchange-rate
app.get('/exchange-rate', async (req: Request, res: Response) => {
  const { from } = req.query;

  if (!from) {
    return res.status(400).json({ error: 'Currency code "from" is required as a query parameter' });
  }

  try {
    // Obtener el valor de la tasa de cambio desde la API externa
    const rate = await fetchObsValue(from as string);

    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    // Responder con el valor de la tasa de cambio
    return res.json({
      from: from,
      to: 'EUR', // EUR es el valor de 'to' en la solicitud a la API externa
      rate: rate
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return res.status(500).send('Error fetching exchange rate');
  }
});

// Endpoint POST /convert
app.post('/convert', async (req: Request, res: Response) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing required fields in request body: "from", "to", "amount"' });
  }

  try {
    // Obtener el valor de la tasa de cambio desde la API externa (solo se necesita 'from')
    const rate = await fetchObsValue(from);

    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    const convertedAmount = amount * rate;

    // Responder con el resultado de la conversión
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

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
