from fastapi import FastAPI, Security, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import httpx
from datetime import datetime, timedelta, timezone
import jwt
from datetime import datetime, timedelta

app = FastAPI()

# OAuth2 scheme (used in main.py)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Allow requests from anywhere (development convenience).
# In production, configure this carefully or set a specific domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Secret key for signing your JWT
# Replace with a secure, random value in production (from an .env file, etc.)
SECRET_KEY = "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"
ALGORITHM = "HS256"

# The data we expect in the request body
class GoogleLoginPayload(BaseModel):
    accessToken: str

@app.post("/google-login")
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
