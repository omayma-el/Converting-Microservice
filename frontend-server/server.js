const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Front-end server running at http://localhost:${port}`);
});
