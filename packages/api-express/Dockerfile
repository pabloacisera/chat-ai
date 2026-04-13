FROM node:20-alpine

WORKDIR /app

# Instalar herramientas para desarrollo (nodemon global)
RUN npm install -g nodemon ts-node typescript

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY nodemon.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]