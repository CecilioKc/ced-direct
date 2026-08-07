# CED-Direct Deployment Guide

## Tech Stack
- Next.js 16 (TypeScript)
- SQLite (better-sqlite3)
- Docker + Docker Compose
- Node.js 20 LTS

## Quick Start (Docker)
Run these commands on your server:

    git clone https://github.com/CecilioKc/ced-direct.git
    cd ced-direct
    cp .env.example .env.local
    docker compose up -d

## Environment Variables
Create a .env.local file with:

    NEXT_PUBLIC_APP_URL=https://yourdomain.com

## Database
- Engine: SQLite
- File location: data/ced.db
- Schema: see database_schema.sql


## Production Checklist
- Change all default passwords via Admin Panel
- Set NEXT_PUBLIC_APP_URL to your domain
- Enable HTTPS via SSL certificate
- Switch to production build: npm run build then npm start
- Set up daily database backup for data/ced.db


## Port Configuration
- Internal container port: 3000
- External host port: configure in docker-compose.yml ports section

## Support
Repository: https://github.com/CecilioKc/ced-direct
