from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cotizador_project', '0009_cotizacion_token_publico'),
        ('finanzas_app', '0005_ingreso_cotizacion'),
    ]

    operations = [
        migrations.CreateModel(
            name='Recibo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cliente_nombre', models.CharField(help_text='Nombre del cliente (libre)', max_length=200)),
                ('producto_nombre', models.CharField(help_text='Nombre del producto/servicio (libre)', max_length=200)),
                ('cantidad', models.DecimalField(decimal_places=2, max_digits=10)),
                ('cantidad_personas', models.PositiveSmallIntegerField(default=1)),
                ('descripcion', models.TextField(blank=True, default='')),
                ('monto_total', models.DecimalField(decimal_places=2, max_digits=12)),
                ('monto_pagado', models.DecimalField(decimal_places=2, max_digits=12)),
                ('fecha_creacion', models.DateField(auto_now_add=True)),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('actualizado', models.DateTimeField(auto_now=True)),
                ('cliente', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recibos', to='cotizador_project.cliente')),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recibos_creados', to='cotizador_project.user')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recibos', to='cotizador_project.organization')),
                ('producto', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recibos', to='cotizador_project.servicio')),
            ],
            options={
                'verbose_name': 'Recibo',
                'verbose_name_plural': 'Recibos',
                'ordering': ['-fecha_creacion', '-creado'],
            },
        ),
        migrations.AddIndex(
            model_name='recibo',
            index=models.Index(fields=['organization', 'fecha_creacion'], name='recibo_org_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='recibo',
            index=models.Index(fields=['organization', 'cliente'], name='recibo_org_cliente_idx'),
        ),
    ]
