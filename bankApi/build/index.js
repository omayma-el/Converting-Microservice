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
// Calcular la fecha de ayer
const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
const START_DATE = (0, date_fns_1.format)(yesterday, 'yyyy-MM-dd');
// Configurar el parser de xml2js
const parser = new xml2js_1.Parser({ explicitArray: false });
// Función para obtener la tasa de cambio desde la API del ECB
function fetchObsValue(currencyCode) {
    return __awaiter(this, void 0, void 0, function* () {
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
            return parseFloat(obsValue);
        }
        catch (error) {
            console.error('Error fetching exchange rate:', error);
            return undefined;
        }
    });
}
// Middleware para parsear JSON en las solicitudes POST
app.use(express_1.default.json());
// Endpoint GET /exchange-rate
app.get('/exchange-rate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from } = req.query;
    if (!from) {
        return res.status(400).json({ error: 'Currency code "from" is required as a query parameter' });
    }
    try {
        // Obtener el valor de la tasa de cambio desde la API externa
        const rate = yield fetchObsValue(from);
        if (!rate) {
            return res.status(404).json({ error: 'Exchange rate not found' });
        }
        // Responder con el valor de la tasa de cambio
        return res.json({
            from: from,
            to: 'EUR', // EUR es el valor de 'to' en la solicitud a la API externa
            rate: rate
        });
    }
    catch (error) {
        console.error('Error fetching exchange rate:', error);
        return res.status(500).send('Error fetching exchange rate');
    }
}));
// Endpoint POST /convert
app.post('/convert', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, amount } = req.body;
    if (!from || !to || !amount) {
        return res.status(400).json({ error: 'Missing required fields in request body: "from", "to", "amount"' });
    }
    try {
        // Obtener el valor de la tasa de cambio desde la API externa (solo se necesita 'from')
        const rate = yield fetchObsValue(from);
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
    }
    catch (error) {
        console.error('Error converting currency:', error);
        return res.status(500).send('Error converting currency');
    }
}));
// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
