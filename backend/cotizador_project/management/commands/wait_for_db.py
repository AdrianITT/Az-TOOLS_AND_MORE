import time

from django.core.management.base import BaseCommand
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    """Espera a que la base de datos configurada esté lista para aceptar conexiones.

    Útil como paso de entrypoint en Docker: el contenedor de Postgres puede
    tardar unos segundos más en aceptar conexiones que en arrancar el proceso.
    """

    help = 'Espera a que la base de datos esté disponible antes de continuar.'

    def add_arguments(self, parser):
        parser.add_argument('--timeout', type=int, default=30, help='Segundos máximos a esperar.')

    def handle(self, *args, **options):
        timeout = options['timeout']
        start = time.time()
        db_ok = False
        while not db_ok and (time.time() - start) < timeout:
            try:
                connections['default'].cursor()
                db_ok = True
            except OperationalError:
                self.stdout.write('Base de datos no disponible todavía, reintentando en 1s...')
                time.sleep(1)

        if not db_ok:
            self.stderr.write(self.style.ERROR(f'La base de datos no respondió dentro de {timeout}s.'))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS('Base de datos disponible.'))
