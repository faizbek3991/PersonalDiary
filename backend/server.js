const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db');

dotenv.config();

const app = express();

// CORS Configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/diaries', require('./routes/diaryRoutes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // Set static folder
    const clientBuildPath = path.join(__dirname, '../frontend/build');

    app.use(express.static(clientBuildPath));

    // Any route that is not an API route gets sent to the React index.html
    app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
