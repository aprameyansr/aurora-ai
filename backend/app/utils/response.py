from typing import Any


def ok(data: Any, message: str = "success") -> dict:
    return {"success": True, "message": message, "data": data}


def err(message: str, detail: str = "") -> dict:
    return {"success": False, "error": message, "detail": detail}
