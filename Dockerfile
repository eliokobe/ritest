FROM node:20-bookworm-slim as builder

WORKDIR /app
COPY package*.json ./

# Instala TODAS las dependencias (incluye dev) de forma reproducible
# En Debian/Bookworm evitamos el problema de binarios nativos de Rollup en Alpine (musl)
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:stable-bookworm
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config básica SPA
RUN echo 'events { worker_connections 1024; } \
http { \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    server { \
        listen 80; \
        server_name localhost; \
        root /usr/share/nginx/html; \
        index index.html; \
        location / { \
            try_files $uri $uri/ /index.html; \
        } \
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
            expires 1y; \
            add_header Cache-Control "public, immutable"; \
        } \
    } \
}' > /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]