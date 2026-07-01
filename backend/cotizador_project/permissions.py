from rest_framework.permissions import BasePermission


class HasRolPermission(BasePermission):
    """
    Verifica que el rol del usuario tenga el permiso requerido para la acción.

    El ViewSet declara el mapeo acción -> permiso vía `permiso_por_accion`, p.ej.:
        permiso_por_accion = {
            'create': 'crear', 'update': 'editar',
            'partial_update': 'editar', 'destroy': 'eliminar',
        }
    Acciones no listadas (list, retrieve, etc.) se permiten a cualquier
    usuario autenticado; el aislamiento por organización lo hace el mixin.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        permiso = getattr(view, 'permiso_por_accion', {}).get(view.action)
        if permiso is None:
            return True

        return request.user.tiene_permiso(permiso)


class PuedeCrearCotizaciones(BasePermission):
    """Gatea la creación de cotizaciones/items según el flag del usuario."""

    def has_permission(self, request, view):
        if view.action != 'create':
            return True
        return bool(request.user.is_authenticated and request.user.puede_crear_cotizaciones)


class PuedeEliminarCotizaciones(BasePermission):
    """Gatea la eliminación de cotizaciones/items según el flag del usuario."""

    def has_permission(self, request, view):
        if view.action != 'destroy':
            return True
        return bool(request.user.is_authenticated and request.user.puede_eliminar_cotizaciones)


class PuedeVerReportes(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.puede_ver_reportes)


class PuedeGestionarUsuarios(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.puede_gestionar_usuarios)
