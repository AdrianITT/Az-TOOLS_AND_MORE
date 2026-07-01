# 📋 PLANIFICACIÓN MODELOS ACTUALIZADA - AZ-TOOLS MULTI-TENANT

## 🎯 Requisitos nuevos integrados

**Originales:**
✅ Cotizador para pequeñas empresas (pastelería, tapicería, etc.)
✅ Clientes: persona natural, empresa, o ambos
✅ Servicios con atributos específicos
✅ Cotizaciones con múltiples items

**NUEVOS:**
✅ **Multi-tenant** - varias empresas/organizaciones usan la app
✅ **Usuarios por empresa** - cada empresa tiene sus usuarios
✅ **Aislamiento de datos** - empresa A NO ve datos de empresa B
✅ **Roles y permisos** - admin, ventas, gerente, etc.

---

## 🏗️ ARQUITECTURA MULTI-TENANT

### Conceptos clave:

**Tenant (Organización):**
```
Una empresa/organización que usa el cotizador
Ej: "Pastelería María", "Tapicería XYZ", "Multiservicio ABC"
```

**Usuario:**
```
Persona que usa la app, pertenece a UNA organización
Ej: María (admin de Pastelería María)
     Carlos (vendedor de Pastelería María)
```

**Datos:** 
```
Clientes, Servicios, Cotizaciones, Items, etc.
Cada uno vinculado a una organización específica
```

---

## 📊 DIAGRAMA DE RELACIONES (Multi-tenant)

```
Organization (Empresa)
├── id
├── nombre
├── ruc
├── email
├── telefono
├── plan (básico, profesional, empresa)
└── activo

    ↓ (relación 1:N)

User (Usuario de la empresa)
├── id
├── organization (FK a Organization)
├── email
├── nombre
├── rol (admin, vendedor, gerente)
├── password_hash
└── activo

    ↓ (relación 1:N a cada uno)

Cliente
├── id
├── organization (FK)
├── tipo (persona/empresa/ambos)
├── datos...

Servicio (padre)
├── id
├── organization (FK)
├── tipo

  PastelServicio (hereda)
  ├── color, pisos, sabor...

  TapiceriaServicio (hereda)
  ├── material, medidas...

Cotizacion
├── id
├── organization (FK)
├── cliente (FK)
├── usuario_creador (FK a User)
├── estado, montos...

ItemCotizacion
├── id
├── cotizacion (FK)
├── servicio (FK)
└── detalles...
```

---

## 💾 MODELOS DJANGO (Multi-tenant)

### 1. ORGANIZACIÓN

```python
class Organization(models.Model):
    """
    Representa una empresa/organización que usa el cotizador.
    Cada organización tiene sus propios clientes, servicios, cotizaciones.
    """
    
    PLAN_CHOICES = [
        ('basico', 'Plan Básico'),
        ('profesional', 'Plan Profesional'),
        ('empresa', 'Plan Empresa'),
    ]
    
    nombre = models.CharField(max_length=200, unique=True)
    ruc = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField()
    telefono = models.CharField(max_length=20, blank=True, null=True)
    sitio_web = models.URLField(blank=True, null=True)
    
    # Datos legales
    direccion = models.TextField(blank=True, null=True)
    ciudad = models.CharField(max_length=100, blank=True, null=True)
    pais = models.CharField(max_length=100, default='Mexico')
    
    # Suscripción
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='basico')
    activo = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    
    # Logo/branding
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    color_primario = models.CharField(max_length=7, default='#3498db')
    
    class Meta:
        verbose_name = 'Organización'
        verbose_name_plural = 'Organizaciones'
        ordering = ['-fecha_registro']
    
    def __str__(self):
        return self.nombre
    
    def puede_crear_usuarios(self):
        """Determina límites según plan"""
        limites = {
            'basico': 3,
            'profesional': 10,
            'empresa': 999
        }
        return self.users.count() < limites[self.plan]
```

---

### 2. USUARIO (personalizado)

```python
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    """
    Usuario personalizado vinculado a una Organización.
    """
    
    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('vendedor', 'Vendedor'),
        ('gerente', 'Gerente'),
        ('contador', 'Contador'),
        ('visualizador', 'Solo visualización'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='users'
    )
    rol = models.CharField(max_length=20, choices=ROLE_CHOICES, default='vendedor')
    activo = models.BooleanField(default=True)
    
    # Permisos específicos
    puede_crear_cotizaciones = models.BooleanField(default=True)
    puede_eliminar_cotizaciones = models.BooleanField(default=False)
    puede_ver_reportes = models.BooleanField(default=False)
    puede_gestionar_usuarios = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ['organization', 'email']  # Email único por org
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.organization.nombre})"
    
    def tiene_permiso(self, permiso):
        """Helper para verificar permisos"""
        permisos_por_rol = {
            'admin': ['crear', 'editar', 'eliminar', 'reportes', 'usuarios'],
            'gerente': ['crear', 'editar', 'reportes'],
            'vendedor': ['crear', 'editar'],
            'contador': ['reportes'],
            'visualizador': ['leer'],
        }
        return permiso in permisos_por_rol.get(self.rol, [])
```

**En settings.py:**
```python
AUTH_USER_MODEL = 'api.User'
```

---

### 3. CLIENTE

```python
class Cliente(models.Model):
    """Cliente de una organización específica"""
    
    TIPO_CLIENTE = [
        ('persona', 'Persona Natural'),
        ('empresa', 'Empresa'),
        ('ambos', 'Persona y Empresa'),
    ]
    
    # Vínculo con organización
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='clientes'
    )
    
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_CLIENTE, default='persona')
    
    # Datos personales
    nombre_personal = models.CharField(max_length=200, blank=True, null=True)
    cedula = models.CharField(max_length=20, blank=True, null=True)
    
    # Datos empresa
    nombre_empresa = models.CharField(max_length=200, blank=True, null=True)
    ruc = models.CharField(max_length=20, blank=True, null=True)
    
    # Contacto
    email = models.EmailField()
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    
    # Admin
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        unique_together = ['organization', 'email']  # Email único por org
        indexes = [
            models.Index(fields=['organization', 'nombre']),
            models.Index(fields=['organization', 'email']),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.organization.nombre})"
```

---

### 4. SERVICIO (Base)

```python
class Servicio(models.Model):
    """Servicio base - padre para herencia"""
    
    TIPO_CHOICES = [
        ('pastel', 'Pastel'),
        ('tapiceria', 'Tapicería'),
        ('otro', 'Otro Servicio'),
    ]
    
    # Vínculo con organización
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='servicios'
    )
    
    nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    descripcion = models.TextField(blank=True, null=True)
    precio_base = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Control
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        verbose_name = 'Servicio'
        verbose_name_plural = 'Servicios'
        unique_together = ['organization', 'nombre']
        indexes = [
            models.Index(fields=['organization', 'tipo']),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.organization.nombre})"
```

---

### 5. SERVICIOS ESPECÍFICOS (Herencia)

```python
class PastelServicio(Servicio):
    """Pastel con atributos específicos"""
    
    color = models.CharField(max_length=100)
    tipo_pastel = models.CharField(max_length=100)  # Chocolate, vainilla, etc
    pisos = models.IntegerField()
    sabor = models.CharField(max_length=100)
    decoracion = models.TextField(blank=True)
    peso_aproximado = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True
    )
    
    class Meta:
        verbose_name = 'Pastel'
        verbose_name_plural = 'Pasteles'


class TapiceriaServicio(Servicio):
    """Tapicería con atributos específicos"""
    
    material = models.CharField(max_length=100)
    color = models.CharField(max_length=100)
    medidas = models.CharField(max_length=100)  # "100x150cm"
    tipo_mueble = models.CharField(max_length=100)  # Sofá, silla, etc
    estado_actual = models.CharField(max_length=100)
    requiere_instalacion = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'Tapicería'
        verbose_name_plural = 'Tapicerías'
```

---

### 6. COTIZACIÓN

```python
class Cotizacion(models.Model):
    """Cotización de una organización"""
    
    ESTADO_CHOICES = [
        ('borrador', 'Borrador'),
        ('enviada', 'Enviada'),
        ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'),
        ('expirada', 'Expirada'),
    ]
    
    # Vínculo con organización
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='cotizaciones'
    )
    
    # Relaciones principales
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name='cotizaciones'
    )
    usuario_creador = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cotizaciones_creadas'
    )
    
    # Datos
    numero = models.CharField(max_length=50)  # NO unique a nivel global, solo por org
    descripcion = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='borrador')
    
    # Montos
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    impuesto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Fechas
    fecha_vencimiento = models.DateField()
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Cotización'
        verbose_name_plural = 'Cotizaciones'
        unique_together = ['organization', 'numero']  # Único por org
        indexes = [
            models.Index(fields=['organization', 'estado']),
            models.Index(fields=['organization', 'cliente']),
            models.Index(fields=['organization', '-creado']),
        ]
    
    def calcular_totales(self):
        """Recalcula montos según items"""
        items = self.items.all()
        self.subtotal = sum(item.calcular_subtotal() for item in items)
        self.impuesto = self.subtotal * 0.16
        self.total = self.subtotal + self.impuesto
        self.save()
    
    def save(self, *args, **kwargs):
        # Generar número único por organización
        if not self.numero:
            from django.utils import timezone
            fecha = timezone.now().strftime("%Y%m%d")
            ultimo = Cotizacion.objects.filter(
                organization=self.organization,
                numero__startswith=f"COT-{fecha}"
            ).last()
            
            secuencia = 1
            if ultimo:
                secuencia = int(ultimo.numero.split('-')[-1]) + 1
            
            self.numero = f"COT-{fecha}-{secuencia:04d}"
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.numero} ({self.organization.nombre})"
```

---

### 7. ITEM COTIZACIÓN

```python
class ItemCotizacion(models.Model):
    """Item de una cotización"""
    
    cotizacion = models.ForeignKey(
        Cotizacion,
        on_delete=models.CASCADE,
        related_name='items'
    )
    servicio = models.ForeignKey(
        Servicio,
        on_delete=models.PROTECT
    )
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    notas = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Item de Cotización'
        verbose_name_plural = 'Items de Cotización'
        ordering = ['id']
    
    def calcular_subtotal(self):
        return self.cantidad * self.precio_unitario
    
    def __str__(self):
        return f"{self.servicio.nombre} x {self.cantidad}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalcular totales de la cotización
        self.cotizacion.calcular_totales()
    
    def delete(self, *args, **kwargs):
        cotizacion = self.cotizacion
        super().delete(*args, **kwargs)
        cotizacion.calcular_totales()
```

---

## 🔐 SEGURIDAD Y AISLAMIENTO

### 1. Middleware para obtener organización del usuario

```python
# api/middleware.py
class OrganizationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.user.is_authenticated:
            request.organization = request.user.organization
        else:
            request.organization = None
        
        response = self.get_response(request)
        return response
```

**En settings.py:**
```python
MIDDLEWARE = [
    # ... otros middlewares ...
    'api.middleware.OrganizationMiddleware',
]
```

---

### 2. Mixin para filtrar por organización

```python
# api/mixins.py
from rest_framework.exceptions import PermissionDenied

class OrganizationFilterMixin:
    """
    Filtro automático de querysets por organización del usuario
    """
    
    def get_queryset(self):
        """Filtra por organización del usuario actual"""
        if not self.request.user.is_authenticated:
            return self.queryset.none()
        
        return self.queryset.filter(organization=self.request.user.organization)
    
    def perform_create(self, serializer):
        """Asigna la organización automáticamente"""
        serializer.save(organization=self.request.user.organization)
    
    def perform_update(self, serializer):
        """Verifica que pertenezca a la organización"""
        if serializer.instance.organization != self.request.user.organization:
            raise PermissionDenied("No tienes permisos sobre este objeto")
        serializer.save()
```

---

### 3. ViewSets con aislamiento

```python
# api/views.py
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Cliente, Cotizacion, ItemCotizacion, Servicio
from .serializers import (
    ClienteSerializer, CotizacionSerializer,
    ItemCotizacionSerializer, ServicioSerializer
)
from .mixins import OrganizationFilterMixin

class ClienteViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """
    Clientes de la organización actual.
    Solo ve clientes de su organización.
    """
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['tipo', 'activo']
    search_fields = ['nombre', 'email']
    ordering_fields = ['nombre', 'creado']
    ordering = ['-creado']


class ServicioViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """
    Servicios de la organización actual.
    """
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['tipo', 'activo']
    search_fields = ['nombre']
    
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            creado_por=self.request.user
        )


class CotizacionViewSet(OrganizationFilterMixin, viewsets.ModelViewSet):
    """
    Cotizaciones de la organización actual.
    """
    queryset = Cotizacion.objects.all()
    serializer_class = CotizacionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['estado', 'cliente']
    search_fields = ['numero', 'cliente__nombre']
    ordering_fields = ['creado', 'total', 'estado']
    ordering = ['-creado']
    
    def perform_create(self, serializer):
        if not self.request.user.tiene_permiso('crear'):
            raise PermissionDenied("No tienes permisos para crear cotizaciones")
        
        serializer.save(
            organization=self.request.user.organization,
            usuario_creador=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de cotización"""
        cotizacion = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        # Verificar permisos
        if not request.user.tiene_permiso('editar'):
            raise PermissionDenied("No tienes permisos")
        
        cotizacion.estado = nuevo_estado
        cotizacion.save()
        return Response(self.get_serializer(cotizacion).data)


class ItemCotizacionViewSet(viewsets.ModelViewSet):
    """Items de cotización"""
    queryset = ItemCotizacion.objects.all()
    serializer_class = ItemCotizacionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Solo items de cotizaciones de su organización"""
        if not self.request.user.is_authenticated:
            return self.queryset.none()
        
        return self.queryset.filter(
            cotizacion__organization=self.request.user.organization
        )
```

---

## 🔑 AUTENTICACIÓN Y TOKENS

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # ...
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# Token auth
from rest_framework.authtoken.models import Token

# Crear token automáticamente
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    if created:
        Token.objects.create(user=instance)
```

---

## 🔗 URLS CON MULTI-TENANT

```python
# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views

router = DefaultRouter()
router.register(r'clientes', views.ClienteViewSet, basename='cliente')
router.register(r'servicios', views.ServicioViewSet, basename='servicio')
router.register(r'cotizaciones', views.CotizacionViewSet, basename='cotizacion')
router.register(r'items', views.ItemCotizacionViewSet, basename='item')

urlpatterns = [
    path('auth/login/', obtain_auth_token, name='api_token_auth'),
    path('', include(router.urls)),
]
```

---

## 🎨 FLUJO DE AUTENTICACIÓN EN FRONTEND

```javascript
// 1. Login con email y contraseña
POST /api/auth/login/
{
  "username": "maria@pasteleriamaria.com",
  "password": "contraseña123"
}

// Response
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbea6f7d"
}

// 2. Guardar token en localStorage
localStorage.setItem('token', token);

// 3. Usar en cada request
headers: {
  "Authorization": "Token 9944b09199c62bcf9418ad846dd0e4bbea6f7d"
}

// 4. Ahora automáticamente ves solo datos de tu organización
GET /api/clientes/
// Solo clientes de "Pastelería María"
```

---

## 📊 COMPARATIVA: Single-tenant vs Multi-tenant

| Aspecto | Single-tenant | Multi-tenant |
|--------|--------------|-------------|
| **Usuarios** | Todos en User | User + Organization |
| **Datos** | Sin filtro | Filtro por Organization |
| **Seguridad** | Básica | Aislamiento obligatorio |
| **Escalabilidad** | 1 empresa | N empresas |
| **Complejidad** | Baja | Media |
| **Base de datos** | 1 por app | 1 compartida, aislada por org |

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Modelos Base
- [ ] Organization
- [ ] User personalizado
- [ ] Cliente (con organization FK)
- [ ] Servicio + subclases
- [ ] Cotización
- [ ] ItemCotizacion

### Fase 2: Seguridad
- [ ] Middleware OrganizationMiddleware
- [ ] Mixin OrganizationFilterMixin
- [ ] ViewSets con filtros
- [ ] Token authentication

### Fase 3: Frontend
- [ ] Login con token
- [ ] Guardar token en localStorage
- [ ] Enviar token en headers
- [ ] UI por usuario/organización

### Fase 4: Extras
- [ ] Roles y permisos avanzados
- [ ] Invitar usuarios a organización
- [ ] Planes de pago (básico, profesional, empresa)
- [ ] Límites por plan (usuarios, cotizaciones, etc.)

---

## ⚙️ SETTINGS.PY COMPLETO

```python
# ... settings base ...

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_filters',
    'api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'api.middleware.OrganizationMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

AUTH_USER_MODEL = 'api.User'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

LANGUAGE_CODE = 'es-mx'
TIME_ZONE = 'America/Mexico_City'
USE_I18N = True
USE_TZ = True
```

---

## ✅ VENTAJAS DE ESTA ARQUITECTURA

✅ **Aislamiento total** - cada organización ve solo sus datos
✅ **Escalable** - soporta N organizaciones
✅ **Seguro** - imposible acceder a datos ajenos
✅ **Flexible** - modelos listos para extensión
✅ **Production-ready** - desde el inicio
✅ **Multi-usuario** - cada org con sus usuarios y roles
✅ **Modular** - fácil agregar nuevos servicios/tipos

---

## 🤔 DECISIONES PENDIENTES

1. **Opción de servicios:** ¿Usas Opción 1 (Herencia) o Opción 2 (JSON)?
   - Recomendación: **Opción 1** (Herencia)

2. **Base de datos:** ¿SQLite o PostgreSQL?
   - SQLite para dev/MVP
   - PostgreSQL para producción multi-tenant

3. **Planes de pago:** ¿Necesitas limites por plan?
   - Básico: 3 usuarios, 50 clientes
   - Profesional: 10 usuarios, 500 clientes
   - Empresa: ilimitado

4. **Invitaciones:** ¿Usuarios invitan a otros usuarios de su org?
   - Sí/No → afecta modelos

---

## 🎬 SIGUIENTE PASO

Confirma:
1. ¿Arquitectura multi-tenant OK?
2. ¿Opción 1 (Herencia) para servicios?
3. ¿SQLite o PostgreSQL?
4. ¿Necesitas planes de pago?

Entonces armo:
- [ ] Código Django completo
- [ ] Serializers con aislamiento
- [ ] ViewSets seguros
- [ ] Frontend con login
- [ ] Tests de seguridad

---

**¿Aprobado este diseño? ¿Cambios o aclaraciones?**
