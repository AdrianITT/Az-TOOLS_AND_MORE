from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finanzas_app', '0003_comprobante'),
    ]

    operations = [
        migrations.AddField(
            model_name='deuda',
            name='comprobante',
            field=models.ImageField(blank=True, null=True, upload_to='comprobantes/'),
        ),
        migrations.AddField(
            model_name='pagodeuda',
            name='comprobante',
            field=models.ImageField(blank=True, null=True, upload_to='comprobantes/'),
        ),
    ]
