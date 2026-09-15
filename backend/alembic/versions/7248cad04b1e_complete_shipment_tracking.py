"""complete shipment tracking

Revision ID: 7248cad04b1e
Revises: 8083de0094ce
Create Date: 2026-08-11 14:27:28.757510

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7248cad04b1e"
down_revision: Union[str, Sequence[str], None] = "8083de0094ce"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ---------------------------------------------------------
    # 1. Create shipment status ENUM first
    # ---------------------------------------------------------

    shipment_status_enum = sa.Enum(
        "Created",
        "Assigned",
        "In_Transit",
        "Delayed",
        "Delivered",
        "Cancelled",
        name="shipmentstatus",
    )

    shipment_status_enum.create(op.get_bind(), checkfirst=True)

    # ---------------------------------------------------------
    # 2. Add shipment tracking columns
    # ---------------------------------------------------------

    op.add_column(
        "shipments",
        sa.Column(
            "tracking_number",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "source",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "destination",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "customer_name",
            sa.String(length=150),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "shipment_weight",
            sa.Float(),
            nullable=True,
        ),
    )

    op.add_column(
        "shipments",
        sa.Column(
            "status",
            shipment_status_enum,
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""

    # ---------------------------------------------------------
    # Remove shipment columns
    # ---------------------------------------------------------

    op.drop_column("shipments", "status")
    op.drop_column("shipments", "shipment_weight")
    op.drop_column("shipments", "customer_name")
    op.drop_column("shipments", "destination")
    op.drop_column("shipments", "source")
    op.drop_column("shipments", "tracking_number")

    # ---------------------------------------------------------
    # Remove ENUM
    # ---------------------------------------------------------

    shipment_status_enum = sa.Enum(
        "Created",
        "Assigned",
        "In_Transit",
        "Delayed",
        "Delivered",
        "Cancelled",
        name="shipmentstatus",
    )

    shipment_status_enum.drop(op.get_bind(), checkfirst=True)