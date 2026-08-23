FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ensure the data directory exists (also created at runtime by server.js,
# this just makes sure the volume mount point below has something to bind to)
RUN mkdir -p data

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3100/health || exit 1

CMD ["node", "server.js"]
