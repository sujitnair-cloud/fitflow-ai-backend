FROM node:20-alpine

# Prisma engines need OpenSSL on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Generate Prisma client from schema
COPY prisma ./prisma/
RUN npx prisma generate

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

EXPOSE 3001

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
