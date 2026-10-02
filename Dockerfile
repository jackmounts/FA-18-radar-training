FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Public origin (e.g. https://radar.example.org) so link previews get an absolute og:image URL
ARG SITE_URL
ENV SITE_URL=$SITE_URL
RUN npm run build

FROM nginx:alpine
# No request logs (the privacy note in the footer promises it); errors only at crit, which carry no client IPs
RUN sed -i -e 's|^\s*access_log .*;|    access_log off;|' -e 's|^error_log .*;|error_log /dev/stderr crit;|' /etc/nginx/nginx.conf
# Serve the export's branded 404 instead of nginx's default page
RUN sed -i 's|^\s*#error_page\s*404 .*|    error_page 404 /404.html;|' /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
