FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN apk add --no-cache mariadb-client
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
