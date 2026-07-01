from django.db import models
from cotizador_project.models import Organization, User


class CodigoQR(models.Model):
    """Código QR personalizado"""

    FORMA_CHOICES = [('square', 'Cuadrado'), ('rounded', 'Redondeado')]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name='qr_codigos'
    )
    titulo = models.CharField(max_length=200)
    url_data = models.URLField()
    png_data = models.BinaryField()
    color_fg = models.CharField(max_length=7, default='#000000')
    color_bg = models.CharField(max_length=7, default='#FFFFFF')
    logo = models.ImageField(upload_to='qr_logos/', blank=True, null=True)
    forma = models.CharField(max_length=20, choices=FORMA_CHOICES, default='square')
    descargado_veces = models.IntegerField(default=0)
    creado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='qr_creados'
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Código QR'
        verbose_name_plural = 'Códigos QR'
        indexes = [models.Index(fields=['organization', 'creado'])]
        ordering = ['-creado']

    def __str__(self):
        return f"{self.titulo} ({self.organization.nombre})"
