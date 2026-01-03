# Development Dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Comando padrão (pode ser sobrescrito no docker-compose)
CMD ["npm", "run", "dev"]
