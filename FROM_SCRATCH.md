# Personal Diary Web App: Build From Scratch

This guide explains how to recreate this Personal Diary MERN app from an empty folder. The app has:

- User registration and login with JWT authentication
- Password hashing with `bcryptjs`
- Protected diary CRUD routes
- MongoDB persistence with Mongoose
- React pages for login, register, dashboard, create, edit, and delete
- A frontend proxy from React to the Express API

Do not copy real values from an existing `.env` file into documentation or Git. Use placeholders like the examples below.

## 1. Prerequisites

Install these first:

- Node.js, preferably v18 or newer
- npm
- MongoDB Atlas account or a local MongoDB server
- REST Client extension for VS Code, Postman, or similar API testing tool

## 2. Create The Project Folders

```powershell
mkdir PersonalDiary
cd PersonalDiary
mkdir backend
```

The final structure will look like this:

```text
PersonalDiary/
  backend/
    config/
      db.js
    controllers/
      authController.js
      diaryController.js
    middleware/
      authMiddleware.js
    models/
      Diary.js
      User.js
    routes/
      authRoutes.js
      diaryRoutes.js
    .env
    package.json
    seed.js
    server.js
    test.http
  frontend/
    public/
    src/
      components/
        Navbar.js
      config/
        api.js
      pages/
        Dashboard.js
        Login.js
        Register.js
      App.css
      App.js
      index.js
      setupProxy.js
    .env
    package.json
  .gitignore
  README.md
```

## 3. Build The Backend

Move into the backend folder:

```powershell
cd backend
npm init -y
```

Install backend dependencies:

```powershell
npm install express mongoose dotenv cors bcryptjs jsonwebtoken
npm install --save-dev nodemon
```

Update `backend/package.json` scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node seed.js",
    "seed:destroy": "node seed.js -d"
  }
}
```

Create backend folders:

```powershell
mkdir config, controllers, middleware, models, routes
```

## 4. Add Backend Environment Variables

Create `backend/.env`:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/personaldiary
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
```

The app reads `MONGODB_URI`, `PORT`, and `JWT_SECRET`. Keep `.env` out of Git.

## 5. Connect Express To MongoDB

Create `backend/config/db.js`:

```js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

        if (!mongoUri) {
            throw new Error('Missing MongoDB URI. Add MONGODB_URI to backend/.env.');
        }

        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000
        });

        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
```

The existing project also includes a Windows DNS fallback for some MongoDB Atlas SRV lookup issues. Start with the simple version above, then add the fallback if Node reports an SRV DNS connection problem on Windows.

## 6. Create The Mongoose Models

Create `backend/models/User.js`:

```js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
```

Create `backend/models/Diary.js`:

```js
const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    mood: {
        type: String,
        default: 'Happy'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Diary', diarySchema);
```

## 7. Add Authentication Logic

Create `backend/controllers/authController.js`:

```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && await bcrypt.compare(password, user.password)) {
            return res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        }

        res.status(401).json({ message: 'Invalid email or password' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser
};
```

Create `backend/middleware/authMiddleware.js`:

```js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
};

module.exports = { protect };
```

Create `backend/routes/authRoutes.js`:

```js
const express = require('express');
const {
    registerUser,
    loginUser
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

module.exports = router;
```

## 8. Add Diary CRUD Logic

Create `backend/controllers/diaryController.js`:

```js
const Diary = require('../models/Diary');

const createDiary = async (req, res) => {
    try {
        const diary = await Diary.create({
            user: req.user._id,
            title: req.body.title,
            content: req.body.content,
            mood: req.body.mood
        });

        res.status(201).json(diary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDiaries = async (req, res) => {
    try {
        const diaries = await Diary.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        res.json(diaries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDiaryById = async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);

        if (!diary) {
            return res.status(404).json({ message: 'Diary not found' });
        }

        if (diary.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json(diary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateDiary = async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);

        if (!diary) {
            return res.status(404).json({ message: 'Diary not found' });
        }

        if (diary.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        diary.title = req.body.title;
        diary.content = req.body.content;
        diary.mood = req.body.mood;

        const updatedDiary = await diary.save();

        res.json(updatedDiary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteDiary = async (req, res) => {
    try {
        const diary = await Diary.findById(req.params.id);

        if (!diary) {
            return res.status(404).json({ message: 'Diary not found' });
        }

        if (diary.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await diary.deleteOne();

        res.json({ message: 'Diary deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createDiary,
    getDiaries,
    getDiaryById,
    updateDiary,
    deleteDiary
};
```

Create `backend/routes/diaryRoutes.js`:

```js
const express = require('express');
const {
    createDiary,
    getDiaries,
    getDiaryById,
    updateDiary,
    deleteDiary
} = require('../controllers/diaryController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createDiary);
router.get('/', protect, getDiaries);
router.get('/:id', protect, getDiaryById);
router.put('/:id', protect, updateDiary);
router.delete('/:id', protect, deleteDiary);

module.exports = router;
```

## 9. Create The Express Server

Create `backend/server.js`:

```js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/diaries', require('./routes/diaryRoutes'));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
};

startServer();
```

Run the backend:

```powershell
npm run dev
```

You should see:

```text
MongoDB Connected
Server running on port 5000
```

## 10. Test The Backend API

Create `backend/test.http`:

```http
@baseUrl = http://localhost:5000
@token = paste_login_token_here

### Register
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "password123!"
}

### Login
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "demo@example.com",
  "password": "password123!"
}

### Create diary
POST {{baseUrl}}/api/diaries
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "title": "My first diary entry",
  "content": "Today I built a MERN diary app.",
  "mood": "Motivated"
}

### Get diaries
GET {{baseUrl}}/api/diaries
Authorization: Bearer {{token}}

### Update diary
PUT {{baseUrl}}/api/diaries/DIARY_ID_HERE
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "title": "Updated title",
  "content": "Updated content",
  "mood": "Happy"
}

### Delete diary
DELETE {{baseUrl}}/api/diaries/DIARY_ID_HERE
Authorization: Bearer {{token}}
```

## 11. Build The Frontend

Return to the project root:

```powershell
cd ..
npx create-react-app frontend
cd frontend
```

Install frontend dependencies:

```powershell
npm install axios react-router-dom http-proxy-middleware
```

Create `frontend/src/config/api.js`:

```js
const API_BASE_URL = '/api';

export default API_BASE_URL;
```

Create `frontend/src/setupProxy.js`:

```js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://localhost:5000',
            changeOrigin: true,
            logLevel: 'debug'
        })
    );
};
```

Important: because `API_BASE_URL` is already `/api`, frontend requests should be written as:

```js
axios.post(`${API_BASE_URL}/auth/login`, formData);
axios.get(`${API_BASE_URL}/diaries`, config);
```

Do not add another `/api` after `API_BASE_URL`, or the browser will call `/api/api/...`.

## 12. Create React Routes

Create `frontend/src/App.js`:

```js
import React from 'react';
import {
    BrowserRouter,
    Routes,
    Route
} from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';
import './App.css';

function App() {
    return (
        <BrowserRouter>
            <Navbar />

            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
```

Create these folders:

```powershell
mkdir src\components, src\pages
```

Create `frontend/src/components/Navbar.js`:

```js
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
    return (
        <div className="navbar">
            <h2>Diary App</h2>

            <div>
                <Link to="/">Login</Link>
                <Link to="/register">Register</Link>
            </div>
        </div>
    );
}

export default Navbar;
```

## 13. Create The Login Page

Create `frontend/src/pages/Login.js`:

```js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await axios.post(
                `${API_BASE_URL}/auth/login`,
                formData
            );

            localStorage.setItem('token', res.data.token);
            alert('Login Success');
            navigate('/dashboard');
        } catch (error) {
            alert(error.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="container">
            <form className="form" onSubmit={handleSubmit}>
                <h1>Login</h1>

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={handleChange}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    onChange={handleChange}
                />

                <button type="submit">Login</button>
            </form>
        </div>
    );
}

export default Login;
```

## 14. Create The Register Page

Create `frontend/src/pages/Register.js`:

```js
import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            await axios.post(
                `${API_BASE_URL}/auth/register`,
                formData
            );

            alert('Register Success');
        } catch (error) {
            alert(error.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="container">
            <form className="form" onSubmit={handleSubmit}>
                <h1>Register</h1>

                <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    onChange={handleChange}
                />

                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={handleChange}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    onChange={handleChange}
                />

                <button type="submit">Register</button>
            </form>
        </div>
    );
}

export default Register;
```

## 15. Create The Dashboard Page

Create `frontend/src/pages/Dashboard.js`:

```js
import React, {
    useCallback,
    useEffect,
    useState
} from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';

function Dashboard() {
    const navigate = useNavigate();
    const [diaries, setDiaries] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        mood: ''
    });

    const token = localStorage.getItem('token');

    const getAuthConfig = useCallback(() => ({
        headers: {
            Authorization: `Bearer ${token}`
        }
    }), [token]);

    const fetchDiaries = useCallback(async () => {
        try {
            const res = await axios.get(
                `${API_BASE_URL}/diaries`,
                getAuthConfig()
            );

            setDiaries(res.data);
        } catch (error) {
            console.log(error);
        }
    }, [getAuthConfig]);

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        fetchDiaries();
    }, [fetchDiaries, navigate, token]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingId) {
                await axios.put(
                    `${API_BASE_URL}/diaries/${editingId}`,
                    formData,
                    getAuthConfig()
                );

                alert('Diary Updated');
                setEditingId(null);
            } else {
                await axios.post(
                    `${API_BASE_URL}/diaries`,
                    formData,
                    getAuthConfig()
                );

                alert('Diary Created');
            }

            setFormData({
                title: '',
                content: '',
                mood: ''
            });

            fetchDiaries();
        } catch (error) {
            alert(error.response?.data?.message || 'Diary request failed');
        }
    };

    const deleteDiary = async (id) => {
        try {
            await axios.delete(
                `${API_BASE_URL}/diaries/${id}`,
                getAuthConfig()
            );

            alert('Diary Deleted');
            fetchDiaries();
        } catch (error) {
            console.log(error);
        }
    };

    const editDiary = (diary) => {
        setEditingId(diary._id);
        setFormData({
            title: diary.title,
            content: diary.content,
            mood: diary.mood
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="dashboard">
            <div className="topbar">
                <h2>My Diaries</h2>
                <button className="logout-btn" onClick={logout}>
                    Logout
                </button>
            </div>

            <form className="form" onSubmit={handleSubmit}>
                <h1>{editingId ? 'Edit Diary' : 'Create Diary'}</h1>

                <input
                    type="text"
                    name="title"
                    placeholder="Title"
                    value={formData.title}
                    onChange={handleChange}
                />

                <textarea
                    name="content"
                    placeholder="Write diary..."
                    rows="5"
                    value={formData.content}
                    onChange={handleChange}
                />

                <input
                    type="text"
                    name="mood"
                    placeholder="Mood"
                    value={formData.mood}
                    onChange={handleChange}
                />

                <button type="submit">
                    {editingId ? 'Update Diary' : 'Save Diary'}
                </button>
            </form>

            <div className="diary-list">
                {diaries.map((diary) => (
                    <div className="diary-card" key={diary._id}>
                        <h3>{diary.title}</h3>
                        <p>{diary.content}</p>
                        <small>Mood: {diary.mood}</small>

                        <div className="btn-group">
                            <button onClick={() => editDiary(diary)}>
                                Edit
                            </button>
                            <button onClick={() => deleteDiary(diary._id)}>
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;
```

## 16. Add Basic Styling

Replace `frontend/src/App.css` with:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
}

body {
    background: #f4f4f4;
}

.navbar {
    background: #222;
    color: white;
    padding: 15px 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.navbar a {
    color: white;
    text-decoration: none;
    margin-left: 20px;
}

.container {
    height: 90vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.form {
    background: white;
    padding: 40px;
    width: 350px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.form h1 {
    margin-bottom: 20px;
    text-align: center;
}

.form input,
.form textarea {
    width: 100%;
    padding: 12px;
    margin-bottom: 15px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

.form textarea {
    resize: none;
}

.form button {
    width: 100%;
    padding: 12px;
    border: none;
    background: #222;
    color: white;
    border-radius: 5px;
    cursor: pointer;
}

.dashboard {
    width: 90%;
    margin: auto;
    padding: 30px 0;
}

.topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.logout-btn {
    padding: 10px 20px;
    border: none;
    background: red;
    color: white;
    cursor: pointer;
    border-radius: 5px;
}

.diary-list {
    margin-top: 30px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.diary-card {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.diary-card h3,
.diary-card p {
    margin-bottom: 10px;
}

.btn-group {
    margin-top: 15px;
    display: flex;
    gap: 10px;
}

.btn-group button {
    padding: 10px 15px;
    border: none;
    cursor: pointer;
    border-radius: 5px;
}
```

## 17. Add Frontend Environment Variables For Codespaces Only

If running the React dev server through GitHub Codespaces or HTTPS tunneling, create `frontend/.env`:

```env
WDS_SOCKET_PROTOCOL=wss
WDS_SOCKET_PORT=0
```

For normal local development, this file may not be needed.

## 18. Run The Full App

Open two terminals.

Backend:

```powershell
cd backend
npm run dev
```

Frontend:

```powershell
cd frontend
npm start
```

Open:

```text
http://localhost:3000
```

Typical flow:

1. Register a user.
2. Login with that user.
3. The backend returns a JWT.
4. The frontend stores the JWT in `localStorage`.
5. Dashboard uses `Authorization: Bearer TOKEN` for diary requests.
6. Create, edit, and delete diary entries.

## 19. Optional Seed Script

The diary model requires a `user` field. If you seed diary data, either:

- Register a user first and include that user's `_id` in each seeded diary, or
- Temporarily create both a seed user and seed diaries in the same script.

A seed diary should look like this:

```js
{
    user: userId,
    title: 'My First Day',
    content: 'Today was an amazing day.',
    mood: 'Excited'
}
```

Then run:

```powershell
npm run seed
```

To clear seeded data:

```powershell
npm run seed:destroy
```

## 20. Create `.gitignore`

Create `.gitignore` in the project root:

```gitignore
node_modules/
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
coverage/
build/
```

## 21. Common Problems

### Frontend calls `/api/api/...`

If `API_BASE_URL` is `/api`, call endpoints like this:

```js
`${API_BASE_URL}/auth/login`
`${API_BASE_URL}/diaries`
```

Not like this:

```js
`${API_BASE_URL}/api/auth/login`
```

### `No token provided`

Login again and check that the token exists in browser local storage.

### `Not authorized`

The token may be expired, malformed, signed with a different `JWT_SECRET`, or missing from the request headers.

### MongoDB does not connect

Check:

- `MONGODB_URI` is present in `backend/.env`
- The password is URL encoded if it has special characters
- Your IP address is allowed in MongoDB Atlas
- The database user has the correct password and permissions

### Seed script fails

The `Diary` schema requires `user`, so diary seed records must include a valid user id.

## 22. API Route Summary

```text
POST   /api/auth/register       Register user
POST   /api/auth/login          Login user and return JWT
POST   /api/diaries             Create diary, protected
GET    /api/diaries             Get current user's diaries, protected
GET    /api/diaries/:id         Get one diary, protected
PUT    /api/diaries/:id         Update diary, protected
DELETE /api/diaries/:id         Delete diary, protected
```

## 23. What To Improve Next

- Redirect to login after successful registration
- Add form validation before submitting
- Replace `alert()` with inline UI messages
- Add loading and empty states in the dashboard
- Add owner check to every single-diary route
- Move deployed API URL into an environment variable
- Add tests for auth and diary controllers
