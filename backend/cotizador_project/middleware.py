class OrganizationMiddleware:
    """Adjunta la organización del usuario autenticado al request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            request.organization = request.user.organization
        else:
            request.organization = None

        return self.get_response(request)
