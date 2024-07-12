"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const date_fns_1 = require("date-fns");
const app = (0, express_1.default)();
const port = 3000;
// Calcular la fecha de hoy menos un día
const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
const START_DATE = (0, date_fns_1.format)(yesterday, 'yyyy-MM-dd'); // Formatear la fecha como string 'yyyy-MM-dd'
// Constante para el código de moneda
const CURRENCY_CODE = 'AUD'; // Puedes cambiar este valor a cualquier otro código de moneda que desees
// Configurar el parser de xml2js
const parser = new xml2js_1.Parser({ explicitArray: false });
// Función para obtener el valor de cambio desde la API del ECB
const fetchObsValue = (currencyCode) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get(`https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.${currencyCode}.EUR.SP00.A`, {
            params: {
                startPeriod: START_DATE
            },
            headers: {
                'Accept': 'application/xml'
            }
        });
        const result = yield parser.parseStringPromise(response.data);
        const obsValue = result['message:GenericData']['message:DataSet']['generic:Series']['generic:Obs']['generic:ObsValue']['$']['value'];
        return obsValue;
    }
    catch (error) {
        console.error('Error fetching exchange rate:', error);
        return undefined;
    }
});
// Endpoint GET /exchange-rate
app.get('/exchange-rate', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obtener el valor de la tasa de cambio desde la API externa
        const obsValue = yield fetchObsValue(CURRENCY_CODE);
        if (!obsValue) {
            return res.status(404).json({ error: 'Exchange rate not found' });
        }
        // Responder con el valor de la tasa de cambio
        return res.json({
            from: CURRENCY_CODE,
            to: 'EUR',
            rate: parseFloat(obsValue)
        });
    }
    catch (error) {
        console.error('Error fetching exchange rate:', error);
        return res.status(500).send('Error fetching exchange rate');
    }
}));
// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
