FROM node:20-alpine AS build
WORKDIR /app
# Copy sources first so that any package.json changes (like new plugins) are installed
COPY spa/ /app/spa/
WORKDIR /app/spa
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
RUN npm run build

FROM node:20-alpine
WORKDIR /srv
# Copy build artifacts
COPY --from=build /app/spa/dist /srv/spa

# Minimal static server with Express to support /spa prefix and SPA fallback
RUN npm init -y && npm install express
COPY server.js /srv/server.js
EXPOSE 80
CMD ["node","/srv/server.js"]