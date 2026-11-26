from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    auth,
    budgets,
    goals,
    nlp,
    notifications,
    reports,
    rule_engine,
    settings,
    telegram,
    transactions,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(transactions.router)
api_router.include_router(budgets.router)
api_router.include_router(goals.router)
api_router.include_router(notifications.router)
api_router.include_router(settings.router)
api_router.include_router(analytics.router)
api_router.include_router(nlp.router)
api_router.include_router(rule_engine.router)
api_router.include_router(reports.router)
api_router.include_router(telegram.router)
