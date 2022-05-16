FROM node:latest

COPY package.json package-lock.json ./ 
RUN npm ci

COPY . .

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 webrtcconnector

USER webrtcconnector

EXPOSE 5000
ENV PORT 5000

CMD ["node", "server.js"]