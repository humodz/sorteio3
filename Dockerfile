FROM node:10.16.0

WORKDIR /app

COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile
COPY src/ ./src/
RUN yarn build
COPY entrypoint.sh wait-for-it.sh ./
COPY dist/ ./dist/

EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
