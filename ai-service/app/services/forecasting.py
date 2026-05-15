def run_time_series_forecast(disease_id: int, days_ahead: int):
    # Placeholder for actual ML model (e.g., ARIMA or Prophet)
    return [
        {"day": i, "predicted_cases": 10 + (i * 2)}
        for i in range(1, days_ahead + 1)
    ]
