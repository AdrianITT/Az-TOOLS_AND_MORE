from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Paginación por defecto del proyecto.

    Permite que el cliente pida páginas más grandes (?page_size=200) para
    poblar selects/checklists que necesitan la lista completa, con un tope
    para no permitir respuestas ilimitadas."""

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200
