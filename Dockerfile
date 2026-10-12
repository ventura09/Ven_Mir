# Imagen minima: la app no tiene dependencias externas.
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public
# Los datos viven en ./data/app.db: se declara como volumen para que sobrevivan
# al contenedor.
RUN mkdir -p /app/data
VOLUME ["/app/data"]
ENV PORT=3000
ENV DATABASE_FILE=/app/data/app.db
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
