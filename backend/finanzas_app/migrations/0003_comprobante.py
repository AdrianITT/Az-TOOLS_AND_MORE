from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finanzas_app', '0002_add_deudas'),
    ]

    operations = [
        migrations.AddField(
            model_name='ingreso',
            name='comprobante',
            field=models.ImageField(blank=True, null=True, upload_to='comprobantes/'),
        ),
        migrations.AddField(
            model_name='gasto',
            name='comprobante',
            field=models.ImageField(blank=True, null=True, upload_to='comprobantes/'),
        ),
    ]
