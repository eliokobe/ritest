FROM node:20-alpine as builder

WORKDIR /app
COPY package*.json ./

# Instala TODAS las dependencias (incluye dev), necesarias para vite
# Evita flags como --only=production que rompen el build
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
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