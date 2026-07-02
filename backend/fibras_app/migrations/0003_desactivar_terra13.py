from django.db import migrations

# TERRA13.MX (Terrafina) dejó de existir como listado .MX en Yahoo Finance:
# sync_fibras confirmó 404 tanto en modo incremental como con --full, y la
# búsqueda de Yahoo (v1/finance/search?q=Terrafina) solo devuelve "CBAOF"
# (OTC Pink Sheets, en USD) — no un ticker BMV en MXN, así que no es un
# reemplazo válido para este catálogo. Se desactiva hasta confirmar un
# símbolo BMV correcto.
TICKER = 'TERRA13.MX'


def desactivar(apps, schema_editor):
    Fibra = apps.get_model('fibras_app', 'Fibra')
    Fibra.objects.filter(ticker=TICKER).update(activo=False)


def reactivar(apps, schema_editor):
    Fibra = apps.get_model('fibras_app', 'Fibra')
    Fibra.objects.filter(ticker=TICKER).update(activo=True)


class Migration(migrations.Migration):

    dependencies = [
        ('fibras_app', '0002_seed_fibras'),
    ]

    operations = [
        migrations.RunPython(desactivar, reactivar),
    ]
