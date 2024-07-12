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
const xml2js_1 = require("xml2js"); // Asegúrate de importar el Parser desde xml2js
const app = (0, express_1.default)();
const port = 3000;
// Configurar el parser de xml2js
const parser = new xml2js_1.Parser({ explicitArray: false });
app.get('/external-api', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get('https://sdw-wsrest.ecb.europa.eu/service/data/EXR/D.AUD.EUR.SP00.A', {
            params: {
                startPeriod: '2024-07-11'
            },
            headers: {
                'Accept': 'application/xml'
            }
        });
        // Convertir la respuesta XML a JSON
        parser.parseString(response.data, (err, result) => {
            if (err) {
                console.error('Error al convertir XML a JSON:', err);
                res.status(500).send('Error al convertir XML a JSON');
            }
            else {
                // Acceder al valor de generic:ObsValue
                const obsValue = result['message:GenericData']['message:DataSet']['generic:Series']['generic:Obs']['generic:ObsValue']['$']['value'];
                // Enviar solo el valor de generic:ObsValue como respuesta JSON
                res.json({ value: obsValue });
            }
        });
    }
    catch (error) {
        console.error('Error al hacer la solicitud a la API externa:', error);
        res.status(500).send('Error al hacer la solicitud a la API externa');
    }
}));
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
