MAX_MONEY_AMOUNT = 1_000_000_000_000

BUDGET_WARNING_THRESHOLD = 75
BUDGET_EXCEEDED_THRESHOLD = 100

ACCESS_TOKEN_COOKIE = "sakucampus_access_token"
CSRF_COOKIE = "sakucampus_csrf_token"
CSRF_HEADER = "X-CSRF-Token"

AUDIT_REGISTER = "auth.register"
AUDIT_LOGIN_SUCCESS = "auth.login.success"
AUDIT_LOGIN_FAILED = "auth.login.failed"
AUDIT_LOGOUT = "auth.logout"
AUDIT_PASSWORD_CHANGED = "auth.password_changed"
AUDIT_TELEGRAM_SECRET_INVALID = "telegram.webhook.secret_invalid"
