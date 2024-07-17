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
const cors_1 = __importDefault(require("cors")); // Import CORS middleware
const app = (0, express_1.default)();
const port = 3000;
// Calculate yesterday's date
const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
const START_DATE = (0, date_fns_1.format)(yesterday, 'yyyy-MM-dd');
// Configure the xml2js parser
const parser = new xml2js_1.Parser({ explicitArray: false });
// Function to get the exchange rate from the ECB API
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
            console.log('API response:', response.data); // Show the external API response in the console
            const result = yield parser.parseStringPromise(response.data);
            // Extract the most recent value from generic:Obs > generic:ObsValue
            const series = result['message:GenericData']['message:DataSet']['generic:Series'];
            const observations = series['generic:Obs'];
            const mostRecentObs = Array.isArray(observations) ? observations[observations.length - 1] : observations;
            const obsValue = mostRecentObs['generic:ObsValue']['$']['value'];
            return parseFloat(obsValue);
        }
        catch (error) {
            console.error('Error fetching exchange rate:', error);
            return undefined;
        }
    });
}
// Middleware to parse JSON in POST requests
app.use(express_1.default.json());
// Enable CORS for all routes
app.use((0, cors_1.default)({
    origin: 'http://localhost:3001', // Replace with your front-end URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
// GET /exchange-rate endpoint
app.get('/exchange-rate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from } = req.query;
    if (!from) {
        return res.status(400).json({ error: 'Currency code "from" is required as a query parameter' });
    }
    try {
        // Get the exchange rate value from the external API
        const rate = yield fetchObsValue(from);
        if (!rate) {
            return res.status(404).json({ error: 'Exchange rate not found' });
        }
        // Respond with the exchange rate value
        return res.json({
            from: from,
            to: 'EUR', // EUR is the value of 'to' in the external API request
            rate: rate
        });
    }
    catch (error) {
        console.error('Error fetching exchange rate:', error);
        return res.status(500).send('Error fetching exchange rate');
    }
}));
// POST /convert endpoint
app.post('/convert', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to, amount } = req.body;
    if (!from || !to || !amount) {
        return res.status(400).json({ error: 'Missing required fields in request body: "from", "to", "amount"' });
    }
    try {
        // Get the exchange rate value from the external API (only 'from' is needed)
        const rate = yield fetchObsValue(from);
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
    }
    catch (error) {
        console.error('Error converting currency:', error);
        return res.status(500).send('Error converting currency');
    }
}));
// Start the server
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
