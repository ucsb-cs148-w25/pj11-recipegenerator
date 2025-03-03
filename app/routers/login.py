from fastapi import FastAPI, Security, HTTPException, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import httpx
from datetime import datetime, timedelta, timezone
import jwt

router = APIRouter()

# OAuth2 scheme (used in main.py)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Secret key for signing your JWT
# Replace with a secure, random value in production (from an .env file, etc.)
SECRET_KEY = "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"
ALGORITHM = "HS256"

# The data we expect in the request body
class GoogleLoginPayload(BaseModel):
    accessToken: str

TEST_USERS = {
    "testuser1": {"password": "password1", "user_id": "user_id_001", "name": "User One"},
    "testuser2": {"password": "password2", "user_id": "user_id_002", "name": "User Two"},
    "testuser3": {"password": "password3", "user_id": "user_id_003", "name": "User Three"}
}

def generate_jwt_token(user_id: str, name: str) -> str:
    payload = {
        "sub": user_id,
        "name": name,
        "exp": datetime.utcnow() + timedelta(hours = 1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(request: LoginRequest):
    """
    Accepts username & password in JSON format.
    """
    user = TEST_USERS.get(request.username)
    
    if user and request.password == user["password"]:
        token = generate_jwt_token(user_id=user["user_id"], name=user["name"])
        return {"access_token": token, "token_type": "bearer"}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/google-login")
async def google_login(payload: GoogleLoginPayload):
    """
    Input: the user's Google access token from the frontend.
    Output: JSONResponse containing a custom JWT token for the user 
            if success, or a error if user is invalid or expired.
    """

    

    # Verify token with Google
    user_info = await verify_google_access_token(payload.accessToken)
    if not user_info:
        return JSONResponse(
            status_code=401, 
            content={"error": "Invalid or expired Google access token"}
        )

    # Build JWT token: user ID, email, and expiration time(24 hours)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    payload_data = {
        "sub": user_info["id"],      # "subject": the user ID from Google
        "email": user_info["email"],
        "exp": expires_at
    }
    # Sign the token with your SECRET_KEY
    my_jwt_token = jwt.encode(payload_data, SECRET_KEY, algorithm=ALGORITHM)

    # 3) Return the token to the client
    return {
        "token": my_jwt_token
    }

async def verify_google_access_token(access_token: str):
    """
    Make a request to Google's UserInfo endpoint to validate the token.
    If valid, returns a dict with user info (e.g. "id", "email", "name", etc.).
    If invalid, returns None.
    """

    async with httpx.AsyncClient() as client:
        # Google has different userinfo endpoints; v2 or v3. Either works.
        # This example uses the v2 endpoint.
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )

    if resp.status_code == 200:
        return resp.json()
    return None


#
def get_current_user(token: str = Security(oauth2_scheme)):
    """
    Extract the Google user ID (`sub`) from the JWT token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]  # Return the Google user ID
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")