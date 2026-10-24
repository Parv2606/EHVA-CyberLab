FROM node:20-alpine

# nmap for the recon module (TCP connect scans only - no raw-socket capabilities needed/added)
RUN apk add --no-cache nmap nmap-scripts

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
