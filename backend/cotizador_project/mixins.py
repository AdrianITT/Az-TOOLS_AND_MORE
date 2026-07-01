from rest_framework.exceptions import PermissionDenied


class OrganizationFilterMixin:
    """
    Filtro automático de querysets por organización del usuario.
    """

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return self.queryset.none()

        return self.queryset.filter(organization=self.request.user.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)

    def perform_update(self, serializer):
        if serializer.instance.organization != self.request.user.organization:
            raise PermissionDenied("No tienes permisos sobre este objeto")
        serializer.save()
