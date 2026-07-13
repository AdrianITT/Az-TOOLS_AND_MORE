from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Organization, User


class LogoutEndpointTests(TestCase):
    """Flujo completo de sesión por token: login → me → logout → token revocado.

    Es el flujo que usa la app móvil (Authorization: Token <key>)."""

    def setUp(self):
        self.org = Organization.objects.create(nombre='Org Test')
        self.user = User.objects.create_user(
            username='movil', password='pass1234', organization=self.org, rol='admin'
        )
        self.client = APIClient()

    def _login(self):
        res = self.client.post('/api/auth/login/', {'username': 'movil', 'password': 'pass1234'})
        self.assertEqual(res.status_code, 200)
        return res.data['token']

    def test_login_devuelve_token_valido(self):
        token = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'movil')

    def test_logout_revoca_el_token(self):
        token = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')

        res = self.client.post('/api/auth/logout/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(Token.objects.filter(user=self.user).exists())

        # El mismo token ya no sirve para ningún endpoint
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 401)

    def test_logout_sin_token_es_401(self):
        res = self.client.post('/api/auth/logout/')
        self.assertEqual(res.status_code, 401)

    def test_relogin_despues_de_logout_genera_token_nuevo(self):
        token_viejo = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token_viejo}')
        self.client.post('/api/auth/logout/')

        self.client.credentials()
        token_nuevo = self._login()
        self.assertNotEqual(token_viejo, token_nuevo)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token_nuevo}')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)
