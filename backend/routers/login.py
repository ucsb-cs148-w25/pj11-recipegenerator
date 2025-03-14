from fastapi import FastAPI, Security, HTTPException, APIRouter
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
import httpx
from datetime import datetime, timedelta, timezone
import jwt
from typing import Optional
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv

router = APIRouter()

# Load environment variables from .env file
load_dotenv()

# Get MongoDB URI from environment variables
uri = os.getenv("MONGODB_URI")
if not uri:
    raise ValueError("MONGODB_URI environment variable is not set. Please check your .env file.")

# Initialize MongoDB client
client = MongoClient(uri, server_api=ServerApi('1'))
db = client["fridge"]
user_profiles = db["user_profiles"]

# OAuth2 scheme (used in main.py)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Get secret key and algorithm from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

# The data we expect in the request body
class GoogleLoginPayload(BaseModel):
    token: str           # Either an ID token or an Access token
    tokenType: str       # "idToken" or "accessToken"
    name: Optional[str] = None
    email: Optional[str] = None
    picture: Optional[str] = None  # Profile picture URL

@router.post("/google-login")
async def google_login(payload: GoogleLoginPayload):
    """
    Accepts:
      {
        "token": "...",
        "tokenType": "idToken" or "accessToken",
        "name": "...",
        "email": "...",
        "picture": "..." // Optional profile picture URL
      }
    Verifies the token with Google, returns {"access_token": encodedJwtToken, "token_type": "bearer"}
    """

    # Verify token with Google
    if payload.tokenType == "accessToken":
        userinfo = await verify_google_access_token(payload.token)
    elif payload.tokenType == "idToken":
        userinfo = await verify_google_id_token(payload.token)
    else:
        return JSONResponse(status_code=400, content={"error": "Unknown tokenType"})
    
    if not userinfo:
        return JSONResponse(
            status_code=401, 
            content={"error": "Invalid or expired Google token: {payload.tokenType}"}
        )

    # Build JWT token: user ID, email, name, picture, and expiration time (24 hours)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    # Get user profile information from payload or Google response
    user_id = userinfo.get("id") or userinfo.get("sub")
    email = payload.email or userinfo.get("email")
    name = payload.name or userinfo.get("name")
    picture = payload.picture or userinfo.get("picture")
    
    # Update or create user profile in MongoDB
    try:
        # Fetch existing user profile
        existing_user = user_profiles.find_one({"user_id": user_id})
        
        # Prepare the update data, only overwrite if new data is provided
        update_data = {
            "name": name,
            "email": email,
            "picture": picture if picture else existing_user.get("picture"),
            "last_login": datetime.now(timezone.utc)
        }
        
        user_profiles.update_one(
            {"user_id": user_id},
            {"$set": update_data},
            upsert=True
        )
    except Exception as e:
        print(f"Error updating user profile in MongoDB: {str(e)}")
        # Continue with token generation even if MongoDB update fails
    
    payload_data = {
        "sub": user_id,      # "subject": the user ID from Google
        "email": email,
        "name": name,
        "picture": picture,
        "exp": expires_at
    }
    
    # Sign the token with your SECRET_KEY
    my_jwt_token = jwt.encode(payload_data, SECRET_KEY, algorithm=ALGORITHM)

    # Return the token to the client
    return {
        "token": my_jwt_token, 
        "token_type": "bearer"
    }

# ============== HELPER FUNCTIONS ================== #
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


def get_user_profile(token: str = Security(oauth2_scheme)):
    """
    Extract the full user profile from the JWT token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "user_id": payload["sub"],
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": payload.get("picture")
        }
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token")