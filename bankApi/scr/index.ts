import express, { Request, Response } from 'express';
import axios from 'axios';
import { Parser } from 'xml2js'; // Asegúrate de importar el Parser desde xml2js
import { format, subDays } from 'date-fns'; // Importa las funciones necesarias de date-fns

const app = express();
const port = 3000;

// Calcular la fecha de hoy menos un día
const yesterday = subDays(new Date(), 1);
const START_DATE = format(yesterday, 'yyyy-MM-dd'); // Formatear la fecha como string 'yyyy-MM-dd'

// Constante para el código de moneda
const CURRENCY_CODE = 'AUD'; // Puedes cambiar este valor a cualquier otro código de moneda que desees

// Configurar el parser de xml2js
const parser = new Parser({ explicitArray: false });

// Endpoint GET /external-api
app.get('/external-api', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.${CURRENCY_CODE}.EUR.SP00.A`, {
      params: {
        startPeriod: START_DATE
      },
      headers: {
        'Accept': 'application/xml'
      }
    });

    // Convertir la respuesta XML a JSON
    parser.parseString(response.data, (err: any, result: any) => {
      if (err) {
        console.error('Error al convertir XML a JSON:', err);
        res.status(500).send('Error al convertir XML a JSON');
      } else {
        // Acceder al valor de generic:ObsValue
        const obsValue = result['message:GenericData']['message:DataSet']['generic:Series']['generic:Obs']['generic:ObsValue']['$']['value'];

        // Enviar solo el valor de generic:ObsValue como respuesta JSON
        res.json({ value: obsValue });
      }
    });

  } catch (error) {
    console.error('Error al hacer la solicitud a la API externa:', error);
    res.status(500).send('Error al hacer la solicitud a la API externa');
  }
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
