"""
WebSocket Connection Manager
Handles real-time broadcasting of sensor data and alerts
to connected dashboard clients.
"""
from fastapi import WebSocket
from typing import Dict, List
import json
import asyncio


class ConnectionManager:
    def __init__(self):
        # restaurant_id → list of active WebSocket connections
        self.active: Dict[str, List[WebSocket]] = {}
        # restaurant_id → latest sensor readings cache
        self.cache: Dict[str, dict] = {}

    async def connect(self, restaurant_id: str, ws: WebSocket):
        await ws.accept()
        if restaurant_id not in self.active:
            self.active[restaurant_id] = []
        self.active[restaurant_id].append(ws)

        # Send cached latest readings immediately on connect
        if restaurant_id in self.cache:
            await ws.send_json({"type": "init", "data": self.cache[restaurant_id]})

    def disconnect(self, restaurant_id: str, ws: WebSocket):
        if restaurant_id in self.active:
            try:
                self.active[restaurant_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, restaurant_id: str, message: dict):
        """Send a message to all clients watching this restaurant."""
        if restaurant_id not in self.active:
            return

        # Update cache
        if message.get("type") == "reading":
            if restaurant_id not in self.cache:
                self.cache[restaurant_id] = {}
            sensor_id = message["data"].get("sensor_id")
            if sensor_id:
                self.cache[restaurant_id][sensor_id] = message["data"]

        dead = []
        for ws in self.active[restaurant_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        for ws in dead:
            try:
                self.active[restaurant_id].remove(ws)
            except ValueError:
                pass

    async def broadcast_alert(self, restaurant_id: str, alert: dict):
        """Broadcast an alert to all connected clients."""
        await self.broadcast(restaurant_id, {
            "type": "alert",
            "data": alert,
        })

    def connection_count(self, restaurant_id: str) -> int:
        return len(self.active.get(restaurant_id, []))


# Singleton instance
ws_manager = ConnectionManager()
