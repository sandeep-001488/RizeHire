# 🚀 RizeHire - AI-Powered Job Portal

RizeHire is a modern, full-stack job portal application with AI-powered features for resume parsing, candidate screening, and intelligent job matching.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## ✨ Features

- 🔐 **Authentication & Authorization** - JWT-based auth with role-based access (Seeker/Poster)
- 📄 **Resume Parsing** - AI-powered resume parsing using Google Gemini
- 🎯 **Smart Job Matching** - Intelligent candidate-job matching
- 💼 **Job Management** - Post, edit, and manage job listings
- 📊 **Application Tracking** - Track application status and feedback
- 🔗 **Blockchain Integration** - Wallet-based verification
- 📧 **Email Notifications** - Automated email system using Resend
- ☁️ **Cloud Storage** - Resume storage with Cloudinary
- 🎨 **Modern UI** - Responsive design with Tailwind CSS and shadcn/ui

## 🛠 Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (Access & Refresh Tokens)
- **AI/ML:** Google Gemini API
- **File Storage:** Cloudinary
- **Email:** Resend API

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** JavaScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **HTTP Client:** Axios

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **MongoDB** - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Cloud) or [Local Installation](https://www.mongodb.com/try/download/community)
- **Git** - [Download](https://git-scm.com/)

### Required API Keys

You'll need to sign up for these services and get API keys:

1. **MongoDB Atlas** - [Sign up](https://www.mongodb.com/cloud/atlas/register)
2. **Google Gemini API** - [Get API Key](https://makersuite.google.com/app/apikey)
3. **Cloudinary** - [Sign up](https://cloudinary.com/users/register/free)
4. **Resend** - [Sign up](https://resend.com/signup)

## 🚀 Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sandeep-001488/RizeHire.git
cd RizeHire
```

### 2. Backend Setup

#### Step 1: Navigate to Backend Directory

```bash
cd backend
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Create Environment File

Create a `.env` file in the `backend` directory:

```bash
touch .env
```

#### Step 4: Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Secrets
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRE=30m
JWT_REFRESH_EXPIRE=7d

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-exp

# Blockchain
ADMIN_WALLET_ADDRESS=your_wallet_address

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
SMTP_FROM=onboarding@resend.dev

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Step 5: Start Backend Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The backend server will start on `http://localhost:5000`

### 3. Frontend Setup

#### Step 1: Navigate to Frontend Directory

Open a new terminal and navigate to the client directory:

```bash
cd client
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Create Environment File

Create a `.env.local` file in the `client` directory:

```bash
touch .env.local
```

#### Step 4: Configure Environment Variables

Add the following to your `client/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### Step 5: Start Frontend Server

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The frontend will start on `http://localhost:3000`

## 🔑 Environment Variables

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port number | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT access tokens | Yes |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | Yes |
| `JWT_EXPIRE` | Access token expiration time | Yes |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration time | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `GEMINI_MODEL` | Gemini model name | Yes |
| `ADMIN_WALLET_ADDRESS` | Admin wallet address | No |
| `FRONTEND_URL` | Frontend application URL | Yes |
| `RESEND_API_KEY` | Resend email service API key | Yes |
| `SMTP_FROM` | Email sender address | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | Yes |

## 🏃 Running the Application

### Development Mode

1. **Start Backend** (Terminal 1):
```bash
cd backend
npm run dev
```

2. **Start Frontend** (Terminal 2):
```bash
cd client
npm run dev
```

3. **Access the Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

### Production Mode

1. **Build Frontend**:
```bash
cd client
npm run build
npm start
```

2. **Start Backend**:
```bash
cd backend
npm start
```

## 📁 Project Structure

```
RizeHire/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   └── seeds/           # Database seeders
│   ├── uploads/             # Temporary file uploads
│   ├── .env                 # Environment variables
│   ├── app.js               # Express app setup
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── app/             # Next.js app directory
│   │   ├── components/      # React components
│   │   ├── lib/             # Utility libraries
│   │   └── stores/          # Zustand stores
│   ├── public/              # Static assets
│   ├── .env.local           # Environment variables
│   └── package.json
│
└── README.md
```

## 🔌 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| POST | `/auth/logout` | Logout user |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password/:token` | Reset password |

### Job Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jobs` | Get all jobs |
| GET | `/jobs/:id` | Get job by ID |
| POST | `/jobs` | Create new job (Poster only) |
| PUT | `/jobs/:id` | Update job (Poster only) |
| DELETE | `/jobs/:id` | Delete job (Poster only) |
| GET | `/jobs/my-posted-jobs` | Get poster's jobs |

### Application Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/applications` | Apply for a job |
| GET | `/applications/my-applications` | Get user's applications |
| GET | `/applications/job/:jobId` | Get job applicants |
| PUT | `/applications/:id/status` | Update application status |
| POST | `/applications/:id/feedback` | Add feedback |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- **Sandeep Kumar** - [GitHub](https://github.com/sandeep-001488)

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Cloudinary for file storage
- Resend for email services
- shadcn/ui for beautiful components

## 📞 Support

For support, email sandeepsanu1230@gmail.com or open an issue in the repository.

---

Made with ❤️ by Sandeep Kumar
