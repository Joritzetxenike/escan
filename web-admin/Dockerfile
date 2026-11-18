# =======================================================
# Panel de inventario (web-admin) servido con nginx
# =======================================================
#
# 1. Compila la web con Node (Vite). Las variables
#    VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY se leen de
#    `.env.local` y quedan incrustadas en la web compilada
#    (son la URL y la clave PÚBLICA; nunca la service_role).
# 2. Sirve la carpeta `dist` con nginx en el puerto 80.
#
# Uso: docker compose up -d --build   (ver docker-compose.yml)
# =======================================================

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Si falta la configuración de Supabase la web arranca pero no
# puede conectar: mejor que falle aquí, al construir.
RUN grep -rqs "supabase.co" dist/assets \
  || (echo "ERROR: falta VITE_SUPABASE_URL en web-admin/.env.local" && exit 1)

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
