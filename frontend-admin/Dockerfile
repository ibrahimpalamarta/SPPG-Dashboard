FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Next's standalone server binds to localhost by default, which the ALB cannot
# reach across the task's network namespace.
ENV HOSTNAME=0.0.0.0
# standalone/ carries its own minimal node_modules, so there is no npm ci here;
# static/ is not included in it and has to be copied alongside.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
