from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from auth import get_supabase, get_user_id
from websocket_manager import ws_manager
import secrets

router = APIRouter()


class SensorCreate(BaseModel):
    name: str
    location: str = "Kitchen"
    sensor_type: str = "temperature"
    min_safe: Optional[float] = None
    max_safe: Optional[float] = None
    alert_enabled: bool = True

class SensorUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    min_safe: Optional[float] = None
    max_safe: Optional[float] = None
    alert_enabled: Optional[bool] = None

class SensorReading(BaseModel):
    """Payload sent by ESP32 or other IoT device."""
    api_key: str
    value: float
    unit: str = "F"
    battery_pct: Optional[int] = None
    rssi: Optional[int] = None          # WiFi signal strength
    device_id: Optional[str] = None

class BulkReading(BaseModel):
    """Multiple sensors reporting in one POST (for multi-probe setups)."""
    api_key: str                         # Restaurant-level API key
    readings: List[dict]                 # [{sensor_id, value, unit, battery_pct}]


# ── Owner endpoints ─────────────────────────────────────────

@router.get("/")
async def get_sensors(user_id: str = Depends(get_user_id)):
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not restaurant.data:
        raise HTTPException(404, "Restaurant not found")

    result = db.table("sensors") \
        .select("*") \
        .eq("restaurant_id", restaurant.data[0]["id"]) \
        .order("created_at") \
        .execute()
    return result.data or []


@router.post("/")
async def register_sensor(data: SensorCreate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not restaurant.data:
        raise HTTPException(404, "Restaurant not found")

    api_key = secrets.token_hex(24)
    result = db.table("sensors").insert({
        "restaurant_id": restaurant.data[0]["id"],
        "name": data.name,
        "location": data.location,
        "sensor_type": data.sensor_type,
        "min_safe": data.min_safe,
        "max_safe": data.max_safe,
        "alert_enabled": data.alert_enabled,
        "api_key": api_key,
        "is_active": True,
    }).execute()
    return result.data[0] if result.data else {}


@router.put("/{sensor_id}")
async def update_sensor(sensor_id: str, data: SensorUpdate, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not restaurant.data:
        raise HTTPException(404, "Restaurant not found")

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    result = db.table("sensors") \
        .update(update_data) \
        .eq("id", sensor_id) \
        .eq("restaurant_id", restaurant.data[0]["id"]) \
        .execute()
    return result.data[0] if result.data else {}


@router.delete("/{sensor_id}")
async def delete_sensor(sensor_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not restaurant.data:
        raise HTTPException(404, "Restaurant not found")
    db.table("sensors").delete().eq("id", sensor_id).eq("restaurant_id", restaurant.data[0]["id"]).execute()
    return {"success": True}


@router.post("/{sensor_id}/regenerate-key")
async def regenerate_api_key(sensor_id: str, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    restaurant = db.table("restaurants").select("id").eq("owner_id", user_id).limit(1).execute()
    if not restaurant.data:
        raise HTTPException(404, "Restaurant not found")
    new_key = secrets.token_hex(24)
    db.table("sensors").update({"api_key": new_key}) \
        .eq("id", sensor_id).eq("restaurant_id", restaurant.data[0]["id"]).execute()
    return {"api_key": new_key}


@router.get("/{sensor_id}/readings")
async def get_readings(sensor_id: str, limit: int = 100, user_id: str = Depends(get_user_id)):
    db = get_supabase()
    result = db.table("sensor_readings") \
        .select("*") \
        .eq("sensor_id", sensor_id) \
        .order("read_at", desc=True) \
        .limit(limit) \
        .execute()
    return result.data or []


# ── IoT Device endpoint (API key auth, no JWT needed) ───────

@router.post("/ingest")
async def ingest_reading(data: SensorReading):
    """
    Called by ESP32 / Govee / any IoT sensor.
    Auth: sensor API key (in body or X-Sensor-Key header).
    No JWT needed — designed for microcontrollers.
    """
    db = get_supabase()

    # Lookup sensor by API key
    sensor_result = db.table("sensors") \
        .select("id, restaurant_id, name, min_safe, max_safe, alert_enabled, sensor_type") \
        .eq("api_key", data.api_key) \
        .eq("is_active", True) \
        .limit(1) \
        .execute()

    if not sensor_result.data:
        raise HTTPException(401, "Invalid sensor API key")

    sensor = sensor_result.data[0]
    restaurant_id = sensor["restaurant_id"]

    # Check violation
    is_violation = False
    if sensor["min_safe"] and data.value < sensor["min_safe"]:
        is_violation = True
    if sensor["max_safe"] and data.value > sensor["max_safe"]:
        is_violation = True

    # Store reading
    db.table("sensor_readings").insert({
        "sensor_id": sensor["id"],
        "restaurant_id": restaurant_id,
        "value": data.value,
        "unit": data.unit,
        "is_violation": is_violation,
        "battery_pct": data.battery_pct,
        "rssi": data.rssi,
        "read_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    # Update sensor last_seen + battery
    update_payload = {"last_seen_at": datetime.now(timezone.utc).isoformat()}
    if data.battery_pct is not None:
        update_payload["battery_pct"] = data.battery_pct
    if data.device_id:
        update_payload["device_id"] = data.device_id
    db.table("sensors").update(update_payload).eq("id", sensor["id"]).execute()

    # Also log to temperature_logs table (for compatibility with existing dashboard)
    db.table("temperature_logs").insert({
        "restaurant_id": restaurant_id,
        "item_name": sensor["name"],
        "location": sensor.get("location", ""),
        "temp_value": data.value,
        "unit": data.unit,
        "min_safe": sensor.get("min_safe"),
        "max_safe": sensor.get("max_safe"),
        "is_violation": is_violation,
        "logged_by": "IoT Sensor",
    }).execute()

    # Push via WebSocket to live dashboard
    reading_payload = {
        "type": "reading",
        "data": {
            "sensor_id": sensor["id"],
            "sensor_name": sensor["name"],
            "value": data.value,
            "unit": data.unit,
            "is_violation": is_violation,
            "min_safe": sensor.get("min_safe"),
            "max_safe": sensor.get("max_safe"),
            "battery_pct": data.battery_pct,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }
    await ws_manager.broadcast(restaurant_id, reading_payload)

    # Create notification + email alert if violation
    if is_violation and sensor.get("alert_enabled"):
        db.table("notifications").insert({
            "restaurant_id": restaurant_id,
            "type": "temp_alert",
            "title": f"🌡️ Temperature Violation: {sensor['name']}",
            "body": f"{sensor['name']} reading {data.value}°{data.unit} is outside safe range ({sensor.get('min_safe','?')}–{sensor.get('max_safe','?')}°{data.unit})",
            "severity": "critical",
            "data": {"sensor_id": sensor["id"], "value": data.value},
        }).execute()

        await ws_manager.broadcast_alert(restaurant_id, {
            "sensor_id": sensor["id"],
            "sensor_name": sensor["name"],
            "value": data.value,
            "unit": data.unit,
        })

        try:
            from services.email_service import send_temp_alert
            await send_temp_alert(restaurant_id, sensor["name"], data.value, sensor.get("min_safe"), sensor.get("max_safe"))
        except Exception:
            pass

    return {
        "received": True,
        "sensor_id": sensor["id"],
        "is_violation": is_violation,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── WebSocket: Live temperature feed ────────────────────────

@router.websocket("/ws/{restaurant_id}")
async def ws_live(websocket: WebSocket, restaurant_id: str):
    """
    WebSocket endpoint for real-time sensor data.
    Connect from frontend: ws://api/api/sensors/ws/{restaurant_id}
    Server pushes new readings whenever ESP32 sends data via /ingest.
    """
    await ws_manager.connect(restaurant_id, websocket)
    try:
        while True:
            # Keep alive — client can also send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(restaurant_id, websocket)
