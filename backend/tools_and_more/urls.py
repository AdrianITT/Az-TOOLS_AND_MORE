"""
URL configuration for tools_and_more project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('cotizador_project.urls')),
    path('api/finanzas/', include('finanzas_app.urls')),
    path('api/qr/', include('qr_app.urls')),
    path('api/fibras/', include('fibras_app.urls')),
    path('api/pdf/', include('pdf_tools_app.urls')),
]

# Media (logos subidos, etc.) se sirve siempre desde Django: este despliegue
# autohospedado no usa almacenamiento de objetos externo (S3/etc.), así que
# no basta con gatear esto por DEBUG como hace el helper por defecto.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
