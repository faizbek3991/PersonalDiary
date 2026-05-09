# Personal Diary Application

A full-stack MERN (MongoDB, Express, React, Node.js) application designed to help users document their daily thoughts, track their moods, and manage their personal reflections.

## Features

- **Full CRUD Functionality**: Create, Read, Update, and Delete diary entries.
- **Mood Tracking**: Categorize entries by mood (e.g., Excited, Peaceful, Motivated).
- **Data Seeding**: Built-in scripts to quickly populate or clear the database for development.
- **Responsive Frontend**: A React-based user interface built with Create React App.

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Environment**: Supports GitHub Codespaces and local development.

## Project Structure

```text
PersonalDiary/
├── backend/                # Express server and API logic
│   ├── controllers/        # Route handlers (logic for CRUD)
│   ├── models/             # Mongoose schemas (Diary model)
│   ├── seed.js             # Database seeding utility
│   └── server.js           # Entry point for backend
└── frontend/               # React application
    ├── public/             # Static assets
    └── src/                # React components and logic
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (Local instance or MongoDB Atlas)

### Setup Instructions

1. **Backend Configuration**:
   - Navigate to the `backend` directory: `cd backend`
   - Install dependencies: `npm install`
   - Create a `.env` file and add your `MONGO_URI` and `PORT`.

2. **Database Seeding**:
   - To import sample data: `node seed.js`
   - To clear the database: `node seed.js -d`

3. **Frontend Configuration**:
   - Navigate to the `frontend` directory: `cd ../frontend`
   - Install dependencies: `npm install`

### Running the App

- **Start Backend**: In `backend/`, run `npm start`.
- **Start Frontend**: In `frontend/`, run `npm start`.

## Troubleshooting

### WebSocket Security Error (GitHub Codespaces)
If you see a `SecurityError: Failed to construct 'WebSocket'` in the browser console, it is likely because the dev server is trying to use an insecure connection over HTTPS. 

To fix this, create a `.env` file in the `frontend/` directory:
```env
WDS_SOCKET_PROTOCOL=wss
WDS_SOCKET_PORT=0
```
Restart your frontend development server after making this change.