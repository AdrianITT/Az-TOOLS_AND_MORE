from django.apps import AppConfig


class CotizadorProjectConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cotizador_project'

    def ready(self):
        from . import signals  # noqa: F401
