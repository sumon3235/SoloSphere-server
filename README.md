# 🚀 SoloSphere Server - Backend API

This is the backend server for the **SoloSphere** Freelance Marketplace. It handles the database, authentication, and all API endpoints required for the frontend.

## 🛠️ Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB
* **Deployment:** Vercel

## 🔑 Key Features
* **Job APIs:** Full CRUD operations for posting, updating, and deleting jobs.
* **Filtering:** Backend endpoints for filtering jobs by email and category.
* **Security:** Configured CORS for secure cross-origin requests.
* **Deployment Ready:** Pre-configured with `vercel.json` for seamless hosting.

## ⚙️ Environment Variables
To run this server locally, create a `.env` file in the root directory and add the following:
```env
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password
