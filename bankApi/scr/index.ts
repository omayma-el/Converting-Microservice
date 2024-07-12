import express, { Request, Response } from 'express';
import axios from 'axios';
import { Parser } from 'xml2js';
import { format, subDays } from 'date-fns';

const app = express();
const port = 3000;

// Calcular la fecha de hoy menos un día
const yesterday = subDays(new Date(), 1);
const START_DATE = format(yesterday, 'yyyy-MM-dd'); // Formatear la fecha como string 'yyyy-MM-dd'

// Constante para el código de moneda
const CURRENCY_CODE = 'AUD'; // Puedes cambiar este valor a cualquier otro código de moneda que desees

// Configurar el parser de xml2js
const parser = new Parser({ explicitArray: false });

// Función para obtener el valor de cambio desde la API del ECB
const fetchObsValue = async (currencyCode: string): Promise<string | undefined> => {
  try {
    const response = await axios.get(`https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.${currencyCode}.EUR.SP00.A`, {
      params: {
        startPeriod: START_DATE
      },
      headers: {
        'Accept': 'application/xml'
      }
    });

    const result = await parser.parseStringPromise(response.data);
    const obsValue = result['message:GenericData']['message:DataSet']['generic:Series']['generic:Obs']['generic:ObsValue']['$']['value'];
    return obsValue;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return undefined;
  }
};

// Endpoint GET /exchange-rate
app.get('/exchange-rate', async (_req: Request, res: Response) => {
  try {
    // Obtener el valor de la tasa de cambio desde la API externa
    const obsValue = await fetchObsValue(CURRENCY_CODE);
    if (!obsValue) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    // Responder con el valor de la tasa de cambio
    return res.json({
      from: CURRENCY_CODE,
      to: 'EUR',
      rate: parseFloat(obsValue)
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return res.status(500).send('Error fetching exchange rate');
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
