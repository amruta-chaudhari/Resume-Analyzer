# ATS Resume Analyzer - Production Ready Single Container
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

WORKDIR /app

# Copy backend and install
COPY ats-backend/package*.json ./ats-backend/
COPY ats-backend/tsconfig.json ./ats-backend/
COPY ats-backend/prisma ./ats-backend/prisma/
COPY ats-backend/src ./ats-backend/src/

RUN npm install -g pnpm

WORKDIR /app/ats-backend
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm exec prisma generate
RUN pnpm run build

# Copy frontend and build
WORKDIR /app
COPY ats-frontend/package*.json ./ats-frontend/
COPY ats-frontend/vite.config.js ./ats-frontend/
COPY ats-frontend/tailwind.config.cjs ./ats-frontend/
COPY ats-frontend/postcss.config.cjs ./ats-frontend/
COPY ats-frontend/index.html ./ats-frontend/
COPY ats-frontend/public ./ats-frontend/public/
COPY ats-frontend/src ./ats-frontend/src/

WORKDIR /app/ats-frontend
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm run build

# Setup production
WORKDIR /app/ats-backend
RUN mkdir -p ./build
RUN cp -r ../ats-frontend/build/* ./build/

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV OPENAI_API_KEY=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
ENV BASE_URL=https://openrouter.ai/api/v1
ENV ANALYSIS_MODEL="google/gemini-2.0-flash-exp:free"
ENV CORS_ORIGINS=*
ENV JWT_SECRET=docker-secret-jwt-key-change-me
ENV JWT_REFRESH_SECRET=docker-secret-refresh-key-change-me
ENV DATABASE_URL=file:./data/dev.db
ENV DATABASE_PROVIDER=sqlite

RUN mkdir -p ./data ./uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["sh", "-c", "rm -f dev.db && pnpm exec prisma db push --accept-data-loss && node dist/index.js"]
