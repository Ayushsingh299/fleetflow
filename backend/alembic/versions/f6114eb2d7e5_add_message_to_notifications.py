"""add message to notifications

Revision ID: f6114eb2d7e5
Revises: a9147c7443d3
Create Date: 2026-08-11 10:02:44.257013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6114eb2d7e5'
down_revision: Union[str, Sequence[str], None] = 'a9147c7443d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'notifications',
        sa.Column('message', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('notifications', 'message')