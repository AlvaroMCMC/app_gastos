# Stage 1: Build
FROM node:18-alpine as build

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci

# Copiar código
COPY . .

# Variable de entorno para build (pasada desde docker-compose)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve con Nginx
FROM nginx:alpine

# Copiar build
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
