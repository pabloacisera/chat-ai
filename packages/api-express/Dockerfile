FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++

RUN npm install -g nodemon tsx typescript

COPY package*.json ./
COPY tsconfig.json ./
COPY nodemon.json ./

RUN npm install

COPY src ./src
COPY prisma ./prisma
COPY data ./data

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]