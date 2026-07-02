from django.db import migrations

FIBRAS_SEED = [
    ('FUNO11.MX', 'Fibra Uno', 'Diversificado'),
    ('TERRA13.MX', 'Terrafina', 'Industrial'),  # desactivada en 0003: ya no cotiza en BMV vía Yahoo Finance
    ('FIBRAPL14.MX', 'Fibra Prologis', 'Industrial'),
    ('FSHOP13.MX', 'Fibra Shop', 'Comercial'),
    ('FMTY14.MX', 'Fibra Monterrey', 'Diversificado'),
    ('DANHOS13.MX', 'Fibra Danhos', 'Diversificado'),
    ('FIHO12.MX', 'Fibra Hotelera', 'Hotelero'),
    ('FIBRAMQ12.MX', 'Fibra Macquarie México', 'Industrial'),
]


def seed_fibras(apps, schema_editor):
    Fibra = apps.get_model('fibras_app', 'Fibra')
    for ticker, nombre, sector in FIBRAS_SEED:
        Fibra.objects.get_or_create(ticker=ticker, defaults={'nombre': nombre, 'sector': sector})


def eliminar_seed(apps, schema_editor):
    Fibra = apps.get_model('fibras_app', 'Fibra')
    Fibra.objects.filter(ticker__in=[t for t, _, _ in FIBRAS_SEED]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('fibras_app', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_fibras, eliminar_seed),
    ]
