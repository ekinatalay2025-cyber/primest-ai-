# Next.js - Railway (secret hatasını bypass)
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Build-time vars - Python API URL'ini Railway'dan al veya aşağıyı güncelle
ARG NEXT_PUBLIC_PYTHON_API_URL=https://primest-python-api-production.up.railway.app
ARG NEXT_PUBLIC_APP_URL=https://natural-quietude-production-9e7a.up.railway.app
ENV NEXT_PUBLIC_PYTHON_API_URL=$NEXT_PUBLIC_PYTHON_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["npm", "run", "start"]
