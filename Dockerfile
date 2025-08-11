FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# events {
#     worker_connections 1024;
# }

# http {
#     include       /etc/nginx/mime.types;
#     default_type  application/octet-stream;

#     server {
#         listen 80;
#         server_name localhost;
#         root /usr/share/nginx/html;
#         index index.html;

#         # Handle client-side routing
#         location / {
#             try_files $uri $uri/ /index.html;
#         }

#         # Cache static assets
#         location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
#             expires 1y;
#             add_header Cache-Control "public, immutable";
#         }
#     }
# }