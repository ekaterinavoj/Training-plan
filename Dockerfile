FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ensure the data directory exists (also created at runtime by server.js,
# this just makes sure the volume mount point below has something to bind to)
RUN mkdir -p data

# Keep a copy of the shipped (generic, non-personal) content files outside of
# /app/data. The docker-compose volume mount (./data:/app/data) replaces the
# whole /app/data folder with whatever is on the host at container start —
# that's correct for personal files (plan.json, profile.json, users.json,
# auth.json), but it means a freshly built image's newer templates.json /
# accessory-variants.json would otherwise never reach a running container,
# since the host's old copies always win. server.js resyncs from this
# untouched copy on every startup — see the "shipped content" block there.
RUN mkdir -p shipped-defaults && \
    cp data/templates.json data/accessory-variants.json shipped-defaults/

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3100/health || exit 1

CMD ["node", "server.js"]
