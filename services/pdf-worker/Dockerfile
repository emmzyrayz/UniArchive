# UniArchive PDF worker: Node 24 (runs the TypeScript directly) with
# Ghostscript (compression) and poppler-utils (pdfinfo, pdftoppm).
FROM node:24-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ghostscript poppler-utils ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src

ENV NODE_ENV=production WORK_DIR=/tmp
USER node
CMD ["node", "src/index.ts"]
