from sqlalchemy.orm import Session

from app.models.driver import Driver
from app.models.user import User


# ============================================================
# CREATE DRIVER
# ============================================================

def create_driver(
    db: Session,
    user_id=None,
):

    # --------------------------------------------------------
    # If user_id is provided, verify user exists
    # --------------------------------------------------------

    if user_id is not None:

        user = (
            db.query(User)
            .filter(
                User.user_id == user_id
            )
            .first()
        )

        if not user:

            raise ValueError(
                "User not found"
            )

        # ----------------------------------------------------
        # Check whether user is already a driver
        # ----------------------------------------------------

        existing_driver = (
            db.query(Driver)
            .filter(
                Driver.user_id == user_id
            )
            .first()
        )

        if existing_driver:

            raise ValueError(
                "User is already assigned to another driver"
            )

    # --------------------------------------------------------
    # Create driver
    # --------------------------------------------------------

    driver = Driver(
        user_id=user_id,
    )

    db.add(driver)

    db.commit()

    db.refresh(driver)

    return driver


# ============================================================
# GET ALL DRIVERS
# ============================================================

def get_drivers(
    db: Session,
):

    return (
        db.query(Driver)
        .all()
    )


# ============================================================
# GET ONE DRIVER
# ============================================================

def get_driver(
    db: Session,
    driver_id,
):

    return (
        db.query(Driver)
        .filter(
            Driver.driver_id == driver_id
        )
        .first()
    )


# ============================================================
# UPDATE DRIVER
# ============================================================

def update_driver(
    db: Session,
    driver,
    user_id=None,
):

    # --------------------------------------------------------
    # Remove user assignment
    # --------------------------------------------------------

    if user_id is None:

        driver.user_id = None

        db.commit()

        db.refresh(driver)

        return driver

    # --------------------------------------------------------
    # Check user exists
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.user_id == user_id
        )
        .first()
    )

    if not user:

        raise ValueError(
            "User not found"
        )

    # --------------------------------------------------------
    # Check whether user is already assigned
    # to another driver
    # --------------------------------------------------------

    existing_driver = (
        db.query(Driver)
        .filter(
            Driver.user_id == user_id,
            Driver.driver_id != driver.driver_id,
        )
        .first()
    )

    if existing_driver:

        raise ValueError(
            "User is already assigned to another driver"
        )

    # --------------------------------------------------------
    # Assign user
    # --------------------------------------------------------

    driver.user_id = user_id

    db.commit()

    db.refresh(driver)

    return driver


# ============================================================
# DELETE DRIVER
# ============================================================

def delete_driver(
    db: Session,
    driver,
):

    db.delete(driver)

    db.commit()

    return True