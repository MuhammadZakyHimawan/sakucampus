from sqlalchemy.engine import make_url

TEST_SCHEMA = "sakucampus_test"


def with_test_schema(database_url: str) -> str:
    url = make_url(database_url)
    query = dict(url.query)
    query["options"] = f"-csearch_path={TEST_SCHEMA},public"
    return url.update_query_dict(query).render_as_string(hide_password=False)


def assert_test_schema(database_url: str) -> None:
    url = make_url(database_url)
    options = url.query.get("options") or ""

    if f"search_path={TEST_SCHEMA}" not in options:
        raise RuntimeError(f"Database URL must use the {TEST_SCHEMA} schema")
