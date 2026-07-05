from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finanzas_app', '0001_initial'),
        ('cotizador_project', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CategoriaDeuda',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('color', models.CharField(default='#e74c3c', max_length=7)),
                ('icono', models.CharField(blank=True, default='💳', max_length=50)),
                ('tipo_amortizacion', models.CharField(
                    choices=[
                        ('revolvente', 'Revolvente'),
                        ('cuotas_fijas', 'Cuotas fijas'),
                        ('cuenta_por_pagar', 'Cuenta por pagar'),
                    ],
                    default='cuotas_fijas',
                    max_length=20,
                )),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('organization', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='categorias_deuda',
                    to='cotizador_project.organization',
                )),
            ],
            options={
                'verbose_name': 'Categoria de Deuda',
                'verbose_name_plural': 'Categorias de Deudas',
            },
        ),
        migrations.AddConstraint(
            model_name='categoriadeuda',
            constraint=models.UniqueConstraint(fields=['organization', 'nombre'], name='unique_categoria_deuda_por_org'),
        ),
        migrations.AddIndex(
            model_name='categoriadeuda',
            index=models.Index(fields=['organization'], name='finanzas_ap_organiza_deuda_idx'),
        ),
        migrations.CreateModel(
            name='Deuda',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('acreedor', models.CharField(max_length=200)),
                ('monto_original', models.DecimalField(decimal_places=2, max_digits=14)),
                ('saldo_actual', models.DecimalField(decimal_places=2, max_digits=14)),
                ('tasa_interes_anual', models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ('pago_periodico', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('dia_pago', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('fecha_inicio', models.DateField()),
                ('fecha_vencimiento', models.DateField(blank=True, null=True)),
                ('estado', models.CharField(
                    choices=[('activa', 'Activa'), ('pagada', 'Pagada'), ('vencida', 'Vencida')],
                    default='activa',
                    max_length=20,
                )),
                ('notas', models.TextField(blank=True, default='')),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('actualizado', models.DateTimeField(auto_now=True)),
                ('categoria', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='deudas',
                    to='finanzas_app.categoriadeuda',
                )),
                ('creado_por', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='deudas_creadas',
                    to='cotizador_project.user',
                )),
                ('organization', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='deudas',
                    to='cotizador_project.organization',
                )),
            ],
            options={
                'verbose_name': 'Deuda',
                'verbose_name_plural': 'Deudas',
                'ordering': ['-creado'],
            },
        ),
        migrations.AddIndex(
            model_name='deuda',
            index=models.Index(fields=['organization', 'categoria'], name='finanzas_ap_deuda_org_cat_idx'),
        ),
        migrations.AddIndex(
            model_name='deuda',
            index=models.Index(fields=['organization', 'estado'], name='finanzas_ap_deuda_org_est_idx'),
        ),
        migrations.CreateModel(
            name='PagoDeuda',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField()),
                ('monto', models.DecimalField(decimal_places=2, max_digits=12)),
                ('saldo_resultante', models.DecimalField(decimal_places=2, max_digits=14)),
                ('notas', models.TextField(blank=True, default='')),
                ('creado', models.DateTimeField(auto_now_add=True)),
                ('creado_por', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='pagos_deuda_creados',
                    to='cotizador_project.user',
                )),
                ('deuda', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='pagos',
                    to='finanzas_app.deuda',
                )),
                ('gastos_cubiertos', models.ManyToManyField(
                    blank=True,
                    related_name='pagos_deuda',
                    to='finanzas_app.gasto',
                )),
            ],
            options={
                'verbose_name': 'Pago de Deuda',
                'verbose_name_plural': 'Pagos de Deuda',
                'ordering': ['-fecha', '-creado'],
            },
        ),
    ]
