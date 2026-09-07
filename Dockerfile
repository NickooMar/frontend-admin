# Stage 1 - compilation

# base image
FROM oven/bun:1-alpine AS base

# set working directory
WORKDIR /usr/src/app

# install and cache app dependencies
COPY package.json bun.lock* ./
RUN bun install

# set dummy values as variables to be replaced at runtime
ENV VITE_DIAGNOSTICA_API_ENDPOINT=REPLACE_VITE_DIAGNOSTICA_API_ENDPOINT_HERE
ENV VITE_DIAGNOSTICA_ENV=REPLACE_VITE_DIAGNOSTICA_ENV_HERE
ENV VITE_COMMIT_HASH=REPLACE_VITE_COMMIT_HASH
ENV VITE_COMMIT_DATE=REPLACE_VITE_COMMIT_DATE

# copy source code to compile
COPY . ./

# type-check (fail the build on type errors)
RUN bun run check:types

# compile
RUN bun run build

# Stage 2 - the production environment

#base image
FROM nginx:alpine

# copy build folder to image
COPY --from=base /usr/src/app/build/ /usr/share/nginx/html/

# copy script to replace variables at runtime
COPY set_variables.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/set_variables.sh
COPY nginx.conf /etc/nginx/conf.d/default.conf

# publish port
EXPOSE 80

# init command
CMD ["/bin/sh", "-c", "/usr/local/bin/set_variables.sh && exec nginx -g 'daemon off;'"]
