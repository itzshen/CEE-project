require('dotenv').config();
const express = require('express');
const cors = require('cors');
const weatherRoutes = require('./routes/weatherRoutes');

const app = express();

const PORT = process.env.PORT || 8080; 

app.use(cors());
app.use(express.json());

app.use('/api', weatherRoutes);

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully running on port ${PORT}`);
});