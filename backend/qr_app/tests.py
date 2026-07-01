from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from cotizador_project.models import Organization, User
from .models import CodigoQR


class CodigoQRTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(nombre='Test Org')
        self.user = User.objects.create_user(
            email='test@test.com',
            password='pass123',
            organization=self.org,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_generar_qr(self):
        response = self.client.post('/api/qr/generar/', {
            'url_data': 'https://example.com',
            'color_fg': '#000000',
            'color_bg': '#FFFFFF',
            'forma': 'square',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('png_base64', response.json())
