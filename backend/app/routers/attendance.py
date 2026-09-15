import datetime as dt
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attendance import Attendance
from app.models.driver import Driver
from app.core.deps import get_current_user, require_roles
from app.models.user import RoleEnum


router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)


# --------------------------------
# Pydantic Schemas
# --------------------------------

class ClockInRequest(BaseModel):
    driver_id: UUID
    status: str = "Present"
    remarks: str | None = None


class ClockOutRequest(BaseModel):
    driver_id: UUID
    remarks: str | None = None


class AttendanceOut(BaseModel):
    attendance_id: UUID
    driver_id: UUID | None = None
    date: dt.date | None = None
    check_in: dt.datetime | None = None
    check_out: dt.datetime | None = None
    status: str | None = "Present"
    remarks: str | None = None

    class Config:
        from_attributes = True


# --------------------------------
# GET ALL ATTENDANCE RECORDS
# --------------------------------

@router.get(
    "/",
    response_model=list[AttendanceOut],
)
def get_attendance_records(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role == RoleEnum.Driver or str(current_user.role) == "Driver":
        driver_profile = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
        if not driver_profile:
            return []
        return db.query(Attendance).filter(Attendance.driver_id == driver_profile.driver_id).order_by(Attendance.date.desc(), Attendance.check_in.desc()).all()
    return db.query(Attendance).order_by(Attendance.date.desc(), Attendance.check_in.desc()).all()


# --------------------------------
# DRIVER CLOCK IN
# --------------------------------

@router.post(
    "/clock-in",
    response_model=AttendanceOut,
    status_code=status.HTTP_201_CREATED,
)
def clock_in(
    data: ClockInRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.Admin, RoleEnum.FleetManager)),
):
    driver = db.query(Driver).filter(Driver.driver_id == data.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    today = dt.datetime.utcnow().date()
    existing = (
        db.query(Attendance)
        .filter(Attendance.driver_id == data.driver_id, Attendance.date == today)
        .first()
    )

    if existing:
        existing.check_in = dt.datetime.utcnow()
        existing.status = data.status
        if data.remarks:
            existing.remarks = data.remarks
        db.commit()
        db.refresh(existing)
        return existing

    attendance = Attendance(
        driver_id=data.driver_id,
        date=today,
        check_in=dt.datetime.utcnow(),
        status=data.status,
        remarks=data.remarks,
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return attendance


# --------------------------------
# DRIVER CLOCK OUT
# --------------------------------

@router.post(
    "/clock-out",
    response_model=AttendanceOut,
)
def clock_out(
    data: ClockOutRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.Admin, RoleEnum.FleetManager)),
):
    today = dt.datetime.utcnow().date()
    attendance = (
        db.query(Attendance)
        .filter(Attendance.driver_id == data.driver_id, Attendance.date == today)
        .first()
    )

    if not attendance:
        raise HTTPException(status_code=404, detail="No active clock-in found for today")

    attendance.check_out = dt.datetime.utcnow()
    if data.remarks:
        attendance.remarks = data.remarks

    db.commit()
    db.refresh(attendance)

    return attendance


# --------------------------------
# GET SINGLE ATTENDANCE RECORD
# --------------------------------

@router.get(
    "/{attendance_id}",
    response_model=AttendanceOut,
)
def get_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    attendance = (
        db.query(Attendance)
        .filter(Attendance.attendance_id == attendance_id)
        .first()
    )

    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Attendance record not found",
        )

    return attendance

# --------------------------------
# DELETE ATTENDANCE RECORD
# --------------------------------

@router.delete(
    "/{attendance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attendance(
    attendance_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.Admin)),
):
    attendance = (
        db.query(Attendance)
        .filter(Attendance.attendance_id == attendance_id)
        .first()
    )

    if not attendance:
        raise HTTPException(
            status_code=404,
            detail="Attendance record not found",
        )

    db.delete(attendance)
    db.commit()
    return None