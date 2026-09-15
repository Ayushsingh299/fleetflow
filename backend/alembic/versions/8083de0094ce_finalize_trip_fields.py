"""finalize trip fields

Revision ID: 8083de0094ce
Revises: f6114eb2d7e5
Create Date: 2026-08-11 10:28:04.444512

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8083de0094ce"
down_revision: Union[str, Sequence[str], None] = "f6114eb2d7e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "trips",
        sa.Column("start_location", sa.Text(), nullable=True)
    )

    op.add_column(
        "trips",
        sa.Column("destination", sa.Text(), nullable=True)
    )

    op.add_column(
        "trips",
        sa.Column("start_time", sa.DateTime(), nullable=True)
    )

    op.add_column(
        "trips",
        sa.Column("end_time", sa.DateTime(), nullable=True)
    )

    op.add_column(
        "trips",
        sa.Column("distance", sa.Float(), nullable=True)
    )

    op.add_column(
        "trips",
        sa.Column("status", sa.String(length=50), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column("trips", "status")
    op.drop_column("trips", "distance")
    op.drop_column("trips", "end_time")
    op.drop_column("trips", "start_time")
    op.drop_column("trips", "destination")
    op.drop_column("trips", "start_location")