import logging
import time
from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from fibras_app.models import Fibra, PrecioHistorico, DividendoHistorico
from fibras_app.services.yahoo_client import obtener_historial_con_reintentos, YahooFinanceError

logger = logging.getLogger('fibras_app')


class Command(BaseCommand):
    help = 'Sincroniza precios y dividendos de FIBRAs activas desde Yahoo Finance.'

    def add_arguments(self, parser):
        parser.add_argument('--tickers', nargs='*', help='Subconjunto de tickers a sincronizar (por defecto, todas las activas).')
        parser.add_argument('--full', action='store_true', help='Ignora el último precio cacheado y trae el histórico completo (lookback configurado).')
        parser.add_argument('--dry-run', action='store_true', help='Consulta Yahoo Finance pero no escribe en la base de datos.')

    def handle(self, *args, **options):
        qs = Fibra.objects.filter(activo=True)
        if options['tickers']:
            qs = qs.filter(ticker__in=options['tickers'])

        if not qs.exists():
            self.stdout.write(self.style.WARNING('No hay FIBRAs activas para sincronizar.'))
            return

        sleep_seconds = getattr(settings, 'FIBRAS_SYNC_SLEEP_SECONDS', 1.0)
        lookback_years = getattr(settings, 'FIBRAS_HISTORIAL_LOOKBACK_YEARS', 10)
        hoy = timezone.now().date()

        for fibra in qs:
            try:
                if options['full'] or fibra.ultima_actualizacion is None:
                    fecha_inicio = hoy.replace(year=hoy.year - lookback_years)
                else:
                    fecha_inicio = fibra.ultima_actualizacion.date() - timedelta(days=5)

                self.stdout.write(f"Sincronizando {fibra.ticker} desde {fecha_inicio}...")
                historial = obtener_historial_con_reintentos(fibra.ticker, fecha_inicio, hoy)

                if not options['dry_run']:
                    self._guardar_precios(fibra, historial['precios'])
                    self._guardar_dividendos(fibra, historial['dividendos'])
                    fibra.ultima_actualizacion = timezone.now()
                    fibra.save(update_fields=['ultima_actualizacion'])

                self.stdout.write(self.style.SUCCESS(
                    f"{fibra.ticker}: {len(historial['precios'])} precios, {len(historial['dividendos'])} dividendos."
                ))
            except YahooFinanceError as exc:
                logger.error('Fallo sincronizando %s: %s', fibra.ticker, exc)
                self.stderr.write(self.style.ERROR(f"{fibra.ticker}: {exc}"))
                continue

            time.sleep(sleep_seconds)

    def _guardar_precios(self, fibra, precios):
        objetos = [
            PrecioHistorico(
                fibra=fibra,
                fecha=p['fecha'],
                precio_cierre=p['precio_cierre'],
                precio_apertura=p['precio_apertura'],
                precio_max=p['precio_max'],
                precio_min=p['precio_min'],
                volumen=p['volumen'],
            )
            for p in precios
        ]
        if not objetos:
            return
        PrecioHistorico.objects.bulk_create(
            objetos,
            update_conflicts=True,
            unique_fields=['fibra', 'fecha'],
            update_fields=['precio_cierre', 'precio_apertura', 'precio_max', 'precio_min', 'volumen'],
        )

    def _guardar_dividendos(self, fibra, dividendos):
        objetos = [
            DividendoHistorico(
                fibra=fibra,
                fecha_pago=d['fecha_pago'],
                monto_por_certificado=d['monto_por_certificado'],
            )
            for d in dividendos
        ]
        if not objetos:
            return
        DividendoHistorico.objects.bulk_create(
            objetos,
            update_conflicts=True,
            unique_fields=['fibra', 'fecha_pago'],
            update_fields=['monto_por_certificado'],
        )
