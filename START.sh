#!/bin/bash
# Start all Janapriya Upscale services

cd /home/jpuser/projects/janapriyaupscale

# Start Docker services (Postgres, Valkey)
docker compose up -d

# Start backend and frontend via PM2
pm2 start ecosystem.config.js

echo "All services started."
echo "  Backend API: http://localhost:8000"
echo "  Frontend:    http://localhost:3000"
