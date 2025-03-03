# login.py

from fastapi import FastAPI, Security, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta, timezone
import httpx
import jwt

router = APIRouter()

# OAuth2 scheme (used in main.py)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Secret key for signing your JWT
# Replace with a secure, random value in production (from an .env file, etc.)
SECRET_KEY = "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"
ALGORITHM = "HS256"

# Pydantic model for the front-end request
class GoogleLoginPayload(BaseModel):
    token: str           # Either an ID token or an Access token
    tokenType: str       # "idToken" or "accessToken"
    name: str = None
    email: str = None

@router.post("/google-login")
async def google_login(payload: GoogleLoginPayload):
    """
    Accepts:
      {
        "token": "...",
        "tokenType": "idToken" or "accessToken",
        "name": "...",
        "email": "..."
      }
    Verifies the token with Google, returns a unique userId for your app.
    """
    if payload.tokenType == "accessToken":
        userinfo = await verify_google_access_token(payload.token)
    elif payload.tokenType == "idToken":
        userinfo = await verify_google_id_token(payload.token)
    else:
        return JSONResponse(status_code=400, content={"error": "Unknown tokenType"})

    if not userinfo:
        return JSONResponse(
            status_code=401,
            content={"error": f"Invalid or expired {payload.tokenType}"}
        )

    # userinfo could have different fields depending on method
    # e.g. for accessToken (userinfo endpoint) -> "id", "email", ...
    # e.g. for idToken (tokeninfo endpoint) -> "sub", "email", ...
    # We'll unify around "googleUserId" below
    googleUserId = userinfo.get("id") or userinfo.get("sub")
    email = userinfo.get("email")

    # Example: we might create or find a user in DB here
    # For now, let's assume we have a userId = googleUserId in a real DB
    userId = f"myapp_{googleUserId}"  # or store in a DB if you prefer

    # Optionally, generate your own JWT for your internal auth
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    internal_payload = {
        "sub": userId,
        "email": email,
        "exp": expires_at,
    }
    custom_jwt = jwt.encode(internal_payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        # Return any data you want the front end to store
        "userId": userId,
        "email": email,
        "myAppJWT": custom_jwt,  # optional
    }

# ============== HELPER FUNCTIONS ================== #

async def verify_google_access_token(access_token: str):
    """
    Check Google's /userinfo for an access token.
    Returns user info or None if invalid.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
    return resp.json() if resp.status_code == 200 else None

async def verify_google_id_token(id_token: str):
    """
    Check Google's /tokeninfo for an ID token.
    Returns user info or None if invalid.
    """
    async with httpx.AsyncClient() as client:
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        resp = await client.get(url)
    return resp.json() if resp.status_code == 200 else None

def get_current_user(token: str = Security(oauth2_scheme)):
    """
    Extract the Google user ID (`sub`) from the JWT token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]  # Return the Google user ID
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")