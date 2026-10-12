<div align="center">

![Abiola Jibade Backend Banner](assets/banner.svg)

# Abiola Jibade Backend — On-Demand Worker & Gig Marketplace API

A production-grade RESTful API and WebSocket backend powering an on-demand gig economy service marketplace. Engineered with **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, **Stripe Escrow Payments**, and **Socket.io** real-time messaging.

[![Express.js](https://img.shields.io/badge/Express.js-4.x-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Escrow_Payments-635BFF?style=for-the-badge&logo=stripe)](https://stripe.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime_Chat-010101?style=for-the-badge&logo=socketdotio)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-green?style=for-the-badge)](LICENSE)

</div>

---

## 🌟 Overview

**Abiola Jibade Backend** is the core transaction and workflow engine facilitating connections between clients requiring specialized on-demand tasks and vetted service workers. The platform handles end-to-end lifecycle management: job posting, candidate bidding/applications, booking scheduling, automated escrow payment capture via Stripe, proof-of-delivery reviews, and worker payouts.

Coupled with the [`abiolajibade_dashboard`](https://github.com/shahjalal-labs/abiolajibade_dashboard), administrators maintain global platform oversight over user verification, dispute arbitration, payment logs, and transaction volume.

---

## 🚀 Key Features & Capabilities

- 👷 **Worker Onboarding & Availability Management**: Worker profiles, skills verification, real-time weekly availability schedules, and localized slot booking.
- 💼 **Job Lifecycle & Escrow Bookings**: Clients post job requests, workers submit applications, and accepted bookings trigger Stripe payment authorization with secure escrow hold.
- 📦 **Proof of Delivery & Dispute Resolution**: Worker delivery proof submission (photo verification, client sign-off) and automated funds release or escalation.
- 💬 **Live Chat & Push Notifications**: WebSocket bidirectional messaging with chat room persistence, read receipts, and Firebase Cloud Messaging (FCM).
- 💳 **Stripe Payouts & Balance Withdrawal**: Integrated worker balance ledger, withdrawal requests, and Stripe transfer webhooks.
- 🛡️ **Enterprise Security & Validation**: Role-Based Access Control (Admin, Client, Worker), Zod request schema validation, bcrypt hashing, and rate limiting.

---

## 🏛️ System Architecture

```
[ Clients & Workers ]              [ Admin Console ]
         │                                 │
         ▼                                 ▼
   [ Nginx / Reverse Proxy & Rate Limiter ]
         │
         ▼
[ Express & TypeScript Application Server ]
   ├── Authentication & RBAC (JWT & bcrypt)
   ├── Job Matching & Booking State Machine
   ├── Real-Time Gateway (Socket.io)
   └── Stripe Payment & Escrow Webhooks
         │
         ├──► [ Prisma ORM ] ──► [ PostgreSQL / MongoDB ]
         ├──► [ Redis ] (Session Cache & Rate Limiting)
         ├──► [ DigitalOcean Spaces / S3 ] (Delivery Proof & Asset Storage)
         └──► [ Firebase Admin ] (Push Notifications)
```

---

## 📁 Repository Structure

```
abiolajibade_backend/
├── assets/
│   └── banner.svg              # Architecture and repository banner
├── prisma/
│   └── schema.prisma           # Prisma data models (Users, Jobs, Bookings, Reviews)
├── src/
│   ├── app/
│   │   ├── modules/
│   │   │   ├── admin/          # Platform administration & analytics
│   │   │   ├── auth/           # Registration, login, OTP verification
│   │   │   ├── availability/   # Slot definitions & calendar schedules
│   │   │   ├── booking/        # Order booking engine & status machine
│   │   │   ├── job/            # Job posts, proposals, and worker bids
│   │   │   ├── message/        # Direct messaging & chat history
│   │   │   ├── notifications/  # User alert dispatch & FCM triggers
│   │   │   ├── report/         # Dispute filing & abuse reporting
│   │   │   ├── review/         # Dual rating system (Worker & Client)
│   │   │   ├── socket/         # WebSocket connection & event handlers
│   │   │   ├── user/           # User profile & location tracking
│   │   │   ├── withdraw/       # Worker withdrawal & revenue disbursements
│   │   │   └── worker/         # Worker vetting & profile credentials
│   │   ├── middlewares/        # Auth guards, global error handler, validation
│   │   └── routes/             # Centralized Express router
│   ├── config/                 # Environment variables and service credentials
│   ├── errors/                 # Standardized AppError & error handler
│   ├── helpers/                # Pagination, JWT tokenization, email templates
│   ├── interfaces/             # TypeScript domain definitions
│   ├── shared/                 # Reusable utility functions
│   ├── app.ts                  # Express application setup
│   └── server.ts               # HTTP & WebSocket bootstrap server
├── .env.example                # Sanitized environment configuration template
├── package.json                # Dependencies and project metadata
└── tsconfig.json               # TypeScript configuration
```

---

## 💻 Tech Stack Specification

| Domain | Selected Technologies |
| :--- | :--- |
| **Runtime & Language** | Node.js (LTS), TypeScript 5.5 |
| **API Framework** | Express.js 4.19 |
| **ORM & Database** | Prisma ORM 6.3, PostgreSQL / MongoDB |
| **Real-time Protocol** | Socket.io 4.x |
| **Payment Gateway** | Stripe SDK (Escrow, Payment Intents, Webhooks) |
| **Cloud Storage** | DigitalOcean Spaces / AWS S3 SDK |
| **Push Notifications** | Firebase Admin SDK |
| **Authentication & Auth** | JSON Web Token (JWT), bcryptjs |
| **Validation** | Zod 3.23 |

---

## 🛠️ Getting Started & Local Development

### Prerequisites

- **Node.js**: `v20.x` or higher
- **PostgreSQL / MongoDB Database**
- **Stripe CLI** (for testing webhooks)

### 1. Clone the Repository

```bash
git clone https://github.com/shahjalal-labs/abiolajibade_backend.git
cd abiolajibade_backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Update `.env` with your database URL, Stripe keys, and JWT secrets.

### 4. Run Database Migrations & Prisma Generation

```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

The API will be available at [http://localhost:5000](http://localhost:5000).

---

## 👨‍💻 Engineering & Authorship

Developed and engineered by **Md. Shahjalal**.

- **GitHub**: [@shahjalal-labs](https://github.com/shahjalal-labs)
- **Email**: [muhommodshahjalal@gmail.com](mailto:muhommodshahjalal@gmail.com)

---

## 📄 License

This project is open-source and available under the [ISC License](LICENSE).
