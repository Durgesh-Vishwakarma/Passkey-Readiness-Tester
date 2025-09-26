# 🔐 Passkey Readiness & Integration Tester

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![WebAuthn](https://img.shields.io/badge/WebAuthn-FF6B6B?style=for-the-badge&logo=webauthn&logoColor=white)](https://webauthn.guide/)

> **Enterprise-grade WebAuthn implementation with real-time security analysis and comprehensive metrics dashboard**

A production-ready demonstration of modern passwordless authentication using **Passkeys (WebAuthn)**, featuring live metrics, security posture analysis, and a professional CLI testing suite. Built to showcase cybersecurity expertise and full-stack development skills.

## ✨ Features

### 🔐 Core Authentication
- **Complete WebAuthn Implementation** - Full passkey registration and authentication flows
- **Cross-Platform Support** - Touch ID, Face ID, Windows Hello, and security keys
- **Email/Username Flexibility** - Support for both username and email-based authentication
- **Real-Time Security Events** - Comprehensive logging and monitoring of authentication activities
- **Biometric Integration** - Platform authenticator support with fallback mechanisms

### 📊 Live Analytics & Monitoring
- **Real-Time Metrics Dashboard** - Live response times, success rates, and security scores
- **Security Posture Analysis** - Dynamic security scoring based on configuration and threats
- **Event-Driven Success Rates** - Accurate registration and authentication success tracking
- **Performance Monitoring** - Response time tracking with rolling averages
- **User Analytics** - Registration patterns, device types, and usage statistics

### 🛠️ Professional CLI Tools
- **Security Testing Suite** - Comprehensive WebAuthn configuration validation
- **Browser Compatibility Testing** - Cross-browser passkey support verification  
- **Report Generation** - HTML, JSON, and PDF security assessment reports
- **Configuration Validation** - RP settings and origin verification

### 🏗️ Enterprise Architecture
- **TypeScript Monorepo** - Scalable workspace with shared types and utilities
- **Production Security** - Helmet, CORS, rate limiting, and request validation
- **MongoDB Atlas Integration** - Cloud database with proper indexing and aggregation
- **Event-Driven Architecture** - Security event logging with comprehensive analytics
- **Modern UI Components** - Radix UI primitives with Tailwind CSS styling

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js 15 App Router]
        B[WebAuthn Demo UI]
        C[Live Metrics Dashboard]
        D[Security Analysis Panel]
    end
    
    subgraph "CLI Tools"
        E[Security Testing CLI]
        F[Report Generator]
        G[Browser Compatibility Tester]
    end
    
    subgraph "Backend API"
        H[Express.js Server]
        I[WebAuthn Controller]
        J[Metrics Controller]
        K[Security Controller]
        L[Response Time Middleware]
    end
    
    subgraph "Data & Security"
        M[(MongoDB Atlas)]
        N[Users & Credentials]
        O[Security Events]
        P[Performance Metrics]
        Q[Challenge Storage]
    end
    
    A --> H
    E --> H
    H --> I
    H --> J
    H --> K
    I --> M
    J --> M
    K --> M
    M --> N
    M --> O
    M --> P
    M --> Q
```

## 📦 Project Structure

```
passkey-readiness-tester/
├── packages/
│   ├── server/          # Express.js WebAuthn API server
│   │   ├── src/
│   │   │   ├── controllers/ # WebAuthn, metrics, security controllers
│   │   │   ├── models/      # User, credential, security event models
│   │   │   ├── routes/      # API route definitions and validation
│   │   │   ├── middleware/  # Error handling, security middleware
│   │   │   ├── db/          # MongoDB connection and indexes
│   │   │   └── utils/       # Environment validation, metrics
│   │   └── package.json
│   ├── web/             # Next.js 15 frontend application
│   │   ├── src/
│   │   │   ├── app/         # App router pages and layouts
│   │   │   ├── components/  # WebAuthn demo, metrics dashboard
│   │   │   └── lib/         # API client and utilities
│   │   └── package.json
│   └── cli/             # Professional security testing CLI
│       ├── src/
│       │   ├── commands/    # Test, report, validate commands
│       │   ├── services/    # Security analyzers and testers
│       │   └── utils/       # Report generation and utilities
│       └── package.json
├── .github/             # Copilot instructions and workflows
└── README.md            # This comprehensive documentation
```

## 🛠️ Technology Stack

### 🔧 Backend (Express.js)
- **Framework**: Express.js 4.19 with TypeScript ES Modules
- **WebAuthn**: @simplewebauthn/server 10.0 for FIDO2/WebAuthn protocol
- **Database**: MongoDB Atlas with proper indexing and aggregation pipelines
- **Validation**: Zod schemas for runtime type validation and API contracts
- **Security**: Helmet, CORS, rate limiting, and comprehensive middleware stack
- **Logging**: Pino with structured logging and request tracking
- **Real-time Metrics**: Custom response time tracking and event aggregation

### 🎨 Frontend (Next.js 15)
- **Framework**: Next.js 15.5 with App Router and React 19
- **Styling**: Tailwind CSS 4.0 with custom design system
- **UI Components**: Radix UI primitives with class-variance-authority
- **Animations**: Framer Motion for smooth interactions and transitions
- **WebAuthn Client**: @simplewebauthn/browser 13.2 for credential operations
- **Icons**: Lucide React with comprehensive icon library
- **Charts**: Recharts for analytics visualization

### 🔨 CLI Tools & DevOps
- **CLI Framework**: Commander.js with Chalk for colored output
- **Browser Testing**: Puppeteer for automated compatibility testing
- **Security Analysis**: Custom vulnerability scanning and configuration validation
- **Build Tools**: TypeScript 5.4 with tsc-alias for path resolution
- **Code Quality**: ESLint 9 with Next.js config and Prettier formatting
- **Package Management**: npm workspaces for monorepo organization

## 🚀 Quick Start

### 📋 Prerequisites
- **Node.js 18+** and **npm 9+** for development
- **MongoDB Atlas** account (free tier works perfectly)
- **Modern browser** with WebAuthn support (Chrome, Firefox, Safari, Edge)
- **Device with biometrics** (Touch ID, Face ID, Windows Hello) for full testing

### 🚀 Installation & Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd passkey-readiness-tester
npm install

# Set up environment variables
# Server configuration
echo "MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/database
DATABASE_NAME=passkey_demo
RP_ID=localhost
RP_NAME=Passkey Demo
ENABLE_ATTESTATION=false
CORS_ORIGINS=http://localhost:3000,http://localhost:3001" > packages/server/.env

# Web configuration  
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api" > packages/web/.env.local
```

### 🏃‍♂️ Running the Application

```bash
# Start both server and web app (recommended)
npm run dev

# Or run services individually:
# Terminal 1: Backend API Server
npm run dev:server

# Terminal 2: Next.js Web Application  
npm run dev:web

# Terminal 3: CLI Development Mode
npm run dev:cli
```

The application will be available at:
- **Web App**: http://localhost:3000
- **API Server**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

## 🧪 Testing & CLI Usage

### 🔍 Security CLI Commands
```bash
# Build CLI tools first
npm run build:cli

# Run comprehensive security tests
npm run test:security

# Test browser compatibility across platforms
npm run test:browsers

# Generate security assessment report
npm run report

# Or use CLI directly:
node packages/cli/dist/cli.js test
node packages/cli/dist/cli.js browser-compat
node packages/cli/dist/cli.js report
```

### 🎯 Available Endpoints for Testing
- **Web App**: http://localhost:3000
- **API Server**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health
- **Metrics API**: http://localhost:4000/api/metrics/summary
- **Security Analysis**: http://localhost:4000/api/security/analysis

## 📊 What This Demonstrates

### For Recruiters & Interviewers
- **Modern Authentication** - Understanding of WebAuthn/FIDO2 standards
- **Security Mindset** - Proper handling of cryptographic operations and user data
- **Full-Stack Skills** - End-to-end TypeScript development
- **Production Readiness** - Enterprise-level architecture and testing
- **User Experience** - Thoughtful UI/UX design for security features

### Technical Competencies
- **Identity & Access Management** - Modern passwordless authentication
- **Security Engineering** - Threat modeling, risk analysis, security testing  
- **Frontend Development** - Advanced React/Next.js with modern tooling
- **Backend Architecture** - Scalable API design with proper data modeling
- **DevOps Practices** - CI/CD, containerization, and deployment automation

## 📈 Live Metrics & Performance

### 🎯 Real-Time Dashboard Features
- **Live Response Time Tracking** - Sub-300ms average response times with rolling window
- **Event-Driven Success Rates** - Real registration/authentication success percentages  
- **Rules-Based Security Scoring** - Dynamic scoring based on attestation, CSP, rate limiting
- **Security Event Monitoring** - Comprehensive logging of all authentication activities
- **User Analytics** - Registration patterns, device types, and credential usage

### 🔍 What Makes This Special
- **Actual Metrics, Not Mock Data** - Real response times and success rates from live events
- **MongoDB Atlas Integration** - Production-ready cloud database with proper indexing
- **Security Event Architecture** - Comprehensive logging for compliance and analysis  
- **Professional CLI Testing** - Automated security validation and browser compatibility
- **Enterprise Security Patterns** - Rate limiting, CORS, CSP, and comprehensive middleware

## 🔒 Security Features

- **Phishing Resistant** - WebAuthn's origin binding prevents credential theft
- **Private Key Protection** - Credentials never leave the user's device
- **Attestation Validation** - Optional hardware authenticator verification
- **Challenge Replay Protection** - Cryptographic nonce prevents replay attacks
- **Rate Limiting** - API protection against brute force attempts

## 🚀 Production Deployment

### 🌐 Recommended Hosting
- **Frontend**: Vercel (Next.js optimized with automatic deployments)
- **Backend**: Railway, Render, or DigitalOcean App Platform
- **Database**: MongoDB Atlas (already configured)
- **CDN**: Vercel Edge Network or Cloudflare

### 🔧 Environment Configuration
```bash
# Production server environment
MONGODB_URL=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/
DATABASE_NAME=passkey_production
RP_ID=yourdomain.com
RP_NAME=Your Production App
ENABLE_ATTESTATION=true
CORS_ORIGINS=https://yourdomain.com
NODE_ENV=production
```

### 📊 Monitoring & Analytics
- **Response Time Tracking** - Built-in middleware with rolling averages
- **Security Event Logging** - MongoDB-based event storage and analysis
- **Error Tracking** - Structured logging with request correlation
- **Performance Metrics** - Real-time dashboard with live updates

## 👨‍💻 Author & Project Info

**Created by**: Durgesh Vishwakarma  
**Role**: Full-Stack Developer & Cybersecurity Engineer  
**LinkedIn**: [https://www.linkedin.com/in/durgesh-vishwakarma-94ab91228/]  
**GitHub**: [https://github.com/Durgesh-Vishwakarma]  
**Email**: [vishwakarmadurgesh21@gmail.com]

### 🎯 Project Purpose
This project demonstrates enterprise-level expertise in:
- **Modern Authentication** - WebAuthn/FIDO2 implementation and security
- **Full-Stack Development** - TypeScript, React, Node.js, MongoDB
- **Security Engineering** - Threat modeling, event logging, risk analysis
- **DevOps & Architecture** - Monorepo structure, API design, database modeling
- **Professional Development** - Code quality, testing, documentation

### 🏆 Perfect For
- **Technical Interviews** - Showcases security and full-stack knowledge
- **Portfolio Projects** - Demonstrates modern authentication expertise  
- **Learning WebAuthn** - Complete, production-ready implementation
- **Security Research** - Foundation for passkey adoption analysis
- **Enterprise Reference** - Real-world authentication patterns and practices

### 🤝 Contributing
Contributions welcome! Please follow conventional commits and include tests.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

### 🌟 Built with ❤️ for the Future of Authentication

*This project represents the cutting edge of passwordless authentication, combining WebAuthn security with modern development practices. It showcases the skills needed for cybersecurity, identity management, and enterprise software development roles.*

**Ready to experience passwordless authentication? Start the demo and create your first passkey!** 🚀