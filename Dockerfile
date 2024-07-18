# Stage 1: Build bankApi
FROM node:latest AS bankApiBuilder
WORKDIR /usr/src/bankApi
COPY bankApi/package*.json ./
RUN npm install
RUN npm install cors
COPY bankApi/ ./
RUN npm run tsc

# Stage 2: Build cachedServiceQuery
FROM node:latest AS cachedServiceQueryBuilder
WORKDIR /usr/src/cachedServiceQuery
COPY cachedServiceQuery/package*.json ./
RUN npm install
COPY cachedServiceQuery/ ./
RUN npm run build

# Stage 3: Build cachedServiceStorage
FROM node:latest AS cachedServiceStorageBuilder
WORKDIR /usr/src/cachedServiceStorage
COPY cachedServiceStorage/package*.json ./
RUN npm install
COPY cachedServiceStorage/ ./
RUN npm run build

# Stage 4: Build calculation_Service
FROM node:latest AS calculationServiceBuilder
WORKDIR /usr/src/calculation_Service
COPY calculation_Service/package*.json ./
RUN npm install
COPY calculation_Service/ ./
RUN npm run build

# Stage 5: Build getAllRates
FROM node:latest AS getAllRatesBuilder
WORKDIR /usr/src/getAllRates
COPY getAllRates/package*.json ./
RUN npm install
COPY getAllRates/ ./
RUN npm run tsc

# Stage 6: Build frontend-server
FROM node:latest AS frontendBuilder
WORKDIR /usr/src/frontend-server
COPY frontend-server/package*.json ./
RUN npm install
COPY frontend-server/ ./

# Stage 7: Final stage
FROM node:latest
WORKDIR /usr/src/app

# Copy built bankApi
COPY --from=bankApiBuilder /usr/src/bankApi/build ./bankApi/build
COPY --from=bankApiBuilder /usr/src/bankApi/node_modules ./bankApi/node_modules
COPY --from=bankApiBuilder /usr/src/bankApi/package*.json ./bankApi/

# Copy built cachedServiceQuery
COPY --from=cachedServiceQueryBuilder /usr/src/cachedServiceQuery/dist ./cachedServiceQuery/dist
COPY --from=cachedServiceQueryBuilder /usr/src/cachedServiceQuery/node_modules ./cachedServiceQuery/node_modules
COPY --from=cachedServiceQueryBuilder /usr/src/cachedServiceQuery/package*.json ./cachedServiceQuery/

# Copy built cachedServiceStorage
COPY --from=cachedServiceStorageBuilder /usr/src/cachedServiceStorage/dist ./cachedServiceStorage/dist
COPY --from=cachedServiceStorageBuilder /usr/src/cachedServiceStorage/node_modules ./cachedServiceStorage/node_modules
COPY --from=cachedServiceStorageBuilder /usr/src/cachedServiceStorage/package*.json ./cachedServiceStorage/

# Copy built calculation_Service
COPY --from=calculationServiceBuilder /usr/src/calculation_Service/dist ./calculation_Service/dist
COPY --from=calculationServiceBuilder /usr/src/calculation_Service/node_modules ./calculation_Service/node_modules
COPY --from=calculationServiceBuilder /usr/src/calculation_Service/package*.json ./calculation_Service/

# Copy built getAllRates
COPY --from=getAllRatesBuilder /usr/src/getAllRates/build ./getAllRates/build
COPY --from=getAllRatesBuilder /usr/src/getAllRates/node_modules ./getAllRates/node_modules
COPY --from=getAllRatesBuilder /usr/src/getAllRates/package*.json ./getAllRates/

# Copy frontend-server
COPY --from=frontendBuilder /usr/src/frontend-server ./frontend-server

# Expose the necessary ports
EXPOSE 3005 3002 3001

# Command to run all services
CMD ["sh", "-c", "node bankApi/build/index.js & node cachedServiceQuery/dist/index.js & node cachedServiceStorage/dist/index.js & node calculation_Service/dist/index.js & node getAllRates/build/index.js & node frontend-server/server.js"]
