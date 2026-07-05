#!/bin/bash
set -e

echo "Esperando a la base de datos..."
python manage.py wait_for_db

echo "Aplicando migraciones..."
python manage.py migrate --noinput

echo "Recolectando estáticos..."
python manage.py collectstatic --noinput

echo "Arrancando gunicorn..."
exec gunicorn tools_and_more.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --access-logfile - \
    --error-logfile -
