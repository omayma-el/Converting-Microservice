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
const port = 3005;
// Calculate yesterday's date
const yesterday = (0, date_fns_1.subDays)(new Date(), 1);
const START_DATE = (0, date_fns_1.format)(yesterday, 'yyyy-MM-dd');
// Configure the xml2js parser
const parser = new xml2js_1.Parser({ explicitArray: false });
// List of acronyms
const acronyms = [
    "AUD",
    "BRL",
    "BGN",
    "CAD",
    "CNY",
    "CZK",
    "DKK",
    "HKD",
    "HUF",
    "ISK",
    "INR",
    "IDR",
    "ILS",
    "JPY",
    "KRW",
    "MYR",
    "MXN",
    "NZD",
    "NOK",
    "PHP",
    "PLN",
    "RON",
    "SGD",
    "ZAR",
    "CHF",
    "THB",
    "TRY",
    "GBP",
    "USD"
];
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
// Function to get exchange rates for all acronyms
function fetchAllRates() {
    return __awaiter(this, void 0, void 0, function* () {
        const rates = yield Promise.all(acronyms.map((acronym) => __awaiter(this, void 0, void 0, function* () {
            const rate = yield fetchObsValue(acronym);
            return {
                key: acronym,
                value: rate !== undefined ? rate.toString() : "N/A"
            };
        })));
        return rates;
    });
}
// Middleware to parse JSON in POST requests
app.use(express_1.default.json());
// Enable CORS for all routes
app.use((0, cors_1.default)({
    origin: 'http://localhost:3002', // Replace with your Calculation Service URL
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
// GET /all-exchange-rates endpoint
app.get('/all-exchange-rates', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rates = yield fetchAllRates();
        return res.json(rates);
    }
    catch (error) {
        console.error('Error fetching all exchange rates:', error);
        return res.status(500).send('Error fetching all exchange rates');
    }
}));
// Start the server
app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
