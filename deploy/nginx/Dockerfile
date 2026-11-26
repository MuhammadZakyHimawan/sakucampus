FROM nginx:1.27-alpine

RUN apk add --no-cache gettext \
    && rm -f /etc/nginx/conf.d/default.conf

COPY app.conf.template /etc/nginx/sakucampus-templates/app.conf.template
COPY bootstrap.conf.template /etc/nginx/sakucampus-templates/bootstrap.conf.template
COPY 40-sakucampus.sh /docker-entrypoint.d/40-sakucampus.sh

RUN chmod +x /docker-entrypoint.d/40-sakucampus.sh
