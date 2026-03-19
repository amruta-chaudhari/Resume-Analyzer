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

WORKDIR /app/ats-backend
RUN npm install
RUN npx prisma generate
RUN npm run build

# Copy frontend and build
WORKDIR /app
COPY ats-frontend/package*.json ./ats-frontend/
COPY ats-frontend/vite.config.js ./ats-frontend/
COPY ats-frontend/tailwind.config.js ./ats-frontend/
COPY ats-frontend/postcss.config.js ./ats-frontend/
COPY ats-frontend/index.html ./ats-frontend/
COPY ats-frontend/public ./ats-frontend/public/
COPY ats-frontend/src ./ats-frontend/src/

WORKDIR /app/ats-frontend
RUN npm install
RUN npm run build

# Setup production
WORKDIR /app/ats-backend
RUN mkdir -p ./public
RUN cp -r ../ats-frontend/build/* ./public/

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV OPENAI_API_KEY=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
ENV BASE_URL=https://openrouter.ai/api/v1
ENV ANALYSIS_MODEL=google/gemini-2.0-flash-exp:free
ENV CORS_ORIGINS=*
ENV JWT_SECRET=docker-secret-jwt-key-change-me
ENV JWT_REFRESH_SECRET=docker-secret-refresh-key-change-me
ENV DATABASE_URL=file:./data/dev.db
ENV DATABASE_PROVIDER=sqlite

RUN mkdir -p ./data ./uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
