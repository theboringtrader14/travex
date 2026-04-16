"""Initial schema — cities and trips tables with seed data

Revision ID: 0001
Revises:
Create Date: 2026-04-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CITIES = [
    ("BLR", "Bangalore",  12.97, 77.59),
    ("DEL", "Delhi",      28.61, 77.20),
    ("MUM", "Mumbai",     19.08, 72.88),
    ("GOI", "Goa",        15.49, 73.83),
    ("CHN", "Chennai",    13.08, 80.27),
    ("HYD", "Hyderabad",  17.38, 78.48),
    ("PNQ", "Pune",       18.52, 73.85),
    ("AMD", "Ahmedabad",  23.02, 72.57),
    ("CBE", "Coimbatore", 11.00, 76.96),
    ("MYS", "Mysore",     12.29, 76.64),
    ("OTY", "Ooty",       11.41, 76.70),
]


def upgrade() -> None:
    # Create cities table
    cities_table = op.create_table(
        "cities",
        sa.Column("id",         sa.Integer(),                  primary_key=True, autoincrement=True),
        sa.Column("code",       sa.String(6),                  nullable=False,   unique=True),
        sa.Column("name",       sa.String(100),                nullable=False),
        sa.Column("lat",        sa.Float(),                    nullable=False),
        sa.Column("lng",        sa.Float(),                    nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),    server_default=sa.text("now()")),
    )

    # Create trips table
    op.create_table(
        "trips",
        sa.Column("id",           sa.Integer(),               primary_key=True, autoincrement=True),
        sa.Column("from_city_id", sa.Integer(),               sa.ForeignKey("cities.id"), nullable=False),
        sa.Column("to_city_id",   sa.Integer(),               sa.ForeignKey("cities.id"), nullable=False),
        sa.Column("mode",         sa.String(10),              nullable=False),
        sa.Column("travel_date",  sa.Date(),                  nullable=False),
        sa.Column("cost_inr",     sa.Integer(),               nullable=False, server_default="0"),
        sa.Column("notes",        sa.Text(),                  nullable=True),
        sa.Column("created_at",   sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at",   sa.DateTime(timezone=True), nullable=True),
    )

    # Seed cities
    op.bulk_insert(
        cities_table,
        [
            {"code": code, "name": name, "lat": lat, "lng": lng}
            for code, name, lat, lng in CITIES
        ],
    )


def downgrade() -> None:
    op.drop_table("trips")
    op.drop_table("cities")
