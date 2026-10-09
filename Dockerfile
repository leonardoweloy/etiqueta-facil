FROM nginx:alpine
COPY --chmod=644 nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=644 index.html style.css app.js /usr/share/nginx/html/
COPY src /usr/share/nginx/html/src
RUN chmod -R a+rX /usr/share/nginx/html/src
EXPOSE 80
