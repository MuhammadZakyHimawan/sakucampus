class EmailAlreadyRegisteredError(Exception):
    """Raised when an email is already used by another account."""


class InvalidCredentialsError(Exception):
    """Raised when login credentials do not match an account."""


class ResourceNotFoundError(Exception):
    """Raised when a requested resource does not exist or is not owned by the user."""


class ConflictError(Exception):
    """Raised when a mutation violates a uniqueness or overlap business rule."""


class ValidationDomainError(Exception):
    """Raised when a domain validation rule fails."""


class InvalidTelegramTokenError(Exception):
    """Raised when a Telegram pairing token is invalid, expired, or already used."""


class TelegramAlreadyLinkedError(Exception):
    """Raised when a Telegram account is already linked to another SakuCampus user."""
