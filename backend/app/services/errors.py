class EmailAlreadyRegisteredError(Exception):
    """Raised when an email is already used by another account."""


class InvalidCredentialsError(Exception):
    """Raised when login credentials do not match an account."""
