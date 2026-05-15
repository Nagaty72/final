from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.forecasting import run_time_series_forecast

router = APIRouter()

class ForecastRequest(BaseModel):
    disease_id: int
    days_ahead: int = 30

@router.post("/predict/trends")
def predict_disease_trends(req: ForecastRequest):
    try:
        predictions = run_time_series_forecast(req.disease_id, req.days_ahead)
        return {"disease_id": req.disease_id, "predictions": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
