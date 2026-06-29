"""One-off schema sync: bring the SQLite DB in line with app.models.

- db.create_all() creates any tables that don't exist yet (event, coupon,
  advertisement) without touching existing tables.
- Existing tables that are missing columns are patched with ALTER TABLE, since
  create_all() never alters an existing table.

Idempotent: safe to run repeatedly.
"""
from sqlalchemy import inspect, text

from app import create_app
from app.extensions import db
from app import models  # noqa: F401  ensure all models are registered


def sync():
    app = create_app()
    with app.app_context():
        # 1. Create any entirely missing tables.
        db.create_all()

        inspector = inspect(db.engine)

        # 2. For every mapped table, add any columns missing from the DB.
        for table in db.metadata.sorted_tables:
            if table.name not in inspector.get_table_names():
                continue
            existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_cols:
                    continue
                col_type = column.type.compile(dialect=db.engine.dialect)
                ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'
                if column.nullable is False and column.default is None and not column.primary_key:
                    # SQLite can't add a NOT NULL column without a default; add as nullable.
                    pass
                print(f"  + {table.name}.{column.name} ({col_type})")
                with db.engine.begin() as conn:
                    conn.execute(text(ddl))

        print("Schema sync complete.")


if __name__ == "__main__":
    sync()
