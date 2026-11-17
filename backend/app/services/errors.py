class EmailAlreadyRegisteredError(Exception):
    """Raised when an email is already used by another account."""


class InvalidCredentialsError(Exception):
    """Raised when login credentials do not match an account."""


class ResourceNotFoundError(Exception):
    """Raised when a requested resource does not exist for the current user."""


class ResourceConflictError(Exception):
    """Raised when a resource would conflict with existing user data."""
