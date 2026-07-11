import secrets

from django.db import migrations, models


def backfill_tokens(apps, schema_editor):
    Cotizacion = apps.get_model('cotizador_project', 'Cotizacion')
    for cot in Cotizacion.objects.filter(token_publico='').iterator():
        cot.token_publico = secrets.token_urlsafe(16)
        cot.save(update_fields=['token_publico'])


class Migration(migrations.Migration):

    dependencies = [
        ('cotizador_project', '0008_sucursal'),
    ]

    operations = [
        # Paso 1: agregar el campo sin unique (todas las filas existentes quedan en '')
        migrations.AddField(
            model_name='cotizacion',
            name='token_publico',
            field=models.CharField(blank=True, default='', editable=False, max_length=64),
            preserve_default=False,
        ),
        # Paso 2: asignar un token distinto a cada cotización existente
        migrations.RunPython(backfill_tokens, migrations.RunPython.noop),
        # Paso 3: ahora sí, la restricción de unicidad
        migrations.AlterField(
            model_name='cotizacion',
            name='token_publico',
            field=models.CharField(blank=True, editable=False, max_length=64, unique=True),
        ),
    ]
