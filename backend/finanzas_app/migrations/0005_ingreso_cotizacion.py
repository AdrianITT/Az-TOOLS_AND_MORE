import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finanzas_app', '0004_comprobante_deudas'),
        ('cotizador_project', '0009_cotizacion_token_publico'),
    ]

    operations = [
        migrations.AddField(
            model_name='ingreso',
            name='cotizacion',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='ingresos',
                to='cotizador_project.cotizacion',
            ),
        ),
    ]
