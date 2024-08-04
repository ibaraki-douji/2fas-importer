FROM node:20 as build

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

COPY . .
RUN npx tsc

FROM node:20 as production


WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=build /usr/src/app/lib ./lib

CMD ["node", "lib/main.js"]