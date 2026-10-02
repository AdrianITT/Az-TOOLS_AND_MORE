import datetime
from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


def recibos_a_items(apps, schema_editor):
    """Cada recibo existente pasa a tener un item con su producto/cantidad/monto."""
    Recibo = apps.get_model('finanzas_app', 'Recibo')
    ReciboItem = apps.get_model('finanzas_app', 'ReciboItem')
    for r in Recibo.objects.all():
        cantidad = r.cantidad or 1
        ReciboItem.objects.create(
            recibo=r,
            servicio_id=r.producto_id,
            nombre=r.producto_nombre,
            cantidad=cantidad,
            precio_unitario=(r.monto_total / cantidad).quantize(Decimal('0.01')),
        )


def items_a_recibos(apps, schema_editor):
    Recibo = apps.get_model('finanzas_app', 'Recibo')
    for r in Recibo.objects.all():
        item = r.items.first()
        if item:
            r.producto_id = item.servicio_id
            r.producto_nombre = item.nombre
            r.cantidad = item.cantidad
            r.save(update_fields=['producto', 'producto_nombre', 'cantidad'])


class Migration(migrations.Migration):

    dependencies = [
        ('cotizador_project', '0009_cotizacion_token_publico'),
        ('finanzas_app', '0006_recibo'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReciboItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(help_text='Nombre del producto/servicio', max_length=200)),
                ('cantidad', models.DecimalField(decimal_places=2, default=1, max_digits=10)),
                ('precio_unitario', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('fecha_servicio', models.DateField(blank=True, null=True)),
                ('atributos', models.JSONField(blank=True, default=list)),
                ('recibo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='finanzas_app.recibo')),
                ('servicio', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recibo_items', to='cotizador_project.servicio')),
            ],
            options={
                'verbose_name': 'Item de Recibo',
                'verbose_name_plural': 'Items de Recibo',
                'ordering': ['id'],
            },
        ),
        migrations.RunPython(recibos_a_items, items_a_recibos),
        migrations.RemoveField(model_name='recibo', name='producto'),
        migrations.RemoveField(model_name='recibo', name='producto_nombre'),
        migrations.RemoveField(model_name='recibo', name='cantidad'),
        migrations.AddField(
            model_name='recibo',
            name='fecha_servicios',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='recibo',
            name='fecha_creacion',
            field=models.DateField(default=datetime.date.today),
        ),
    ]
