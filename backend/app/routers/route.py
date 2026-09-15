from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.deps import get_current_user
from app.services.routing import get_route


router = APIRouter(
    prefix="/routes",
    tags=["Routes"],
)


class RouteRequest(BaseModel):
    start_lat: float = Field(..., ge=-90, le=90)
    start_lon: float = Field(..., ge=-180, le=180)

    end_lat: float = Field(..., ge=-90, le=90)
    end_lon: float = Field(..., ge=-180, le=180)
    
    route_type: str = "Fastest"


class RouteResponse(BaseModel):
    distance_meters: float
    duration_seconds: float
    formatted_duration: str | None = None
    geometry: dict
    cached: bool


@router.post(
    "/calculate",
    response_model=RouteResponse,
)
async def calculate_route(
    request: RouteRequest,
    current_user=Depends(get_current_user),
):

    try:

        result = await get_route(
            start_lat=request.start_lat,
            start_lon=request.start_lon,
            end_lat=request.end_lat,
            end_lon=request.end_lon,
            route_type=request.route_type,
        )

        return result

    except Exception as e:

        raise HTTPException(
            status_code=502,
            detail=f"Route calculation failed: {str(e)}",
        )