# Grafik smen (employee shift schedule) - production image for Bothost
#
# Bothost specifics (see https://bothost.ru/docs):
# - On some nodes /app is bind-mounted with the Git sources at container
#   start, so build artifacts (.next) must live OUTSIDE /app.
#   -> We keep the whole app in /usr/src/app.
# - Persistent data (SQLite) must live in /app/data - it is the volume
#   that survives redeploys and container restarts.
#   -> DATABASE_URL=file:/app/data/schedule.db
# - The web server must listen on 0.0.0.0 and take the port from the
#   PORT env variable (the panel port must match it).
#   -> `next start -H 0.0.0.0 -p ${PORT:-3000}` in package.json.
#
# Keep this file ASCII/UTF-8 without BOM (non-ASCII comments may break
# the Bothost build agent).

FROM node:22-bookworm-slim

# openssl is required by Prisma engines on Debian slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# 1) Dependencies (cached unless package*.json change)
COPY package.json package-lock.json ./
RUN npm ci

# 2) Prisma client + query engines for this platform
COPY prisma ./prisma
RUN npx prisma generate

# 3) Build the Next.js app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 4) Persistent volume directory for the SQLite database
RUN mkdir -p /app/data && chmod 777 /app/data

ENV NODE_ENV=production \
    DATABASE_URL=file:/app/data/schedule.db \
    SEED_DEMO=1

# init-db.mjs: prisma db push + demo seed on the very first run,
# then start the production server. Bothost may override PORT at runtime.
EXPOSE 3000
CMD ["sh", "-c", "node scripts/init-db.mjs && npm start"]
