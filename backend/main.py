"""
This file defines the main FastAPI application for the fridge management project.
Here, we integrate the Pydantic models from app/models.py into our endpoints 
to provide strongly typed request/response handling and better documentation.

We also define a new endpoint for handling image uploads and converting them
to recipe information via an ML function in ML_functions.py.

We configure the docs to show at the root URL ("/") by setting docs_url="/".
We also remove or repurpose the existing root endpoint to avoid conflicts.
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Query
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import login
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from typing import Optional

# Import `get_current_user` from `login.py`
from backend.routers.login import get_current_user, get_user_profile


# Import the ML functions
from backend.ML_functions import generate_delicious_recipes, extract_recipe_from_image

# Import the Pydantic models from app/models.py 
from backend.models import (
    OpeningPageResponse,
    Item, 
    FridgeItem,
    AddItemResponse,
    RemoveItemResponse,
    UpdateItemResponse,
    GenerateSuggestionsResponse,
    GenerateRecipesResponse,
    ImageRecipeResponse,
    FavoriteRecipe,
    RemoveFavoriteRequest,
    RecipePreferences,
    UserProfile,
    UpdateProfilePictureRequest,
    UpdateProfileResponse,
    UpdateUserInfoRequest,
    FriendInfo,
    FriendsListResponse
)

# Define a new model for user search results
class UserSearchResult(BaseModel):
    user_id: str
    name: str
    email: str
    picture: Optional[str] = None

class UserSearchResponse(BaseModel):
    users: list[UserSearchResult]
    count: int

class FriendRequest(BaseModel):
    friend_id: str

class FriendResponse(BaseModel):
    success: bool
    message: str

# MongoDB URI

# Load environment variables from .env file
load_dotenv()

# Get MongoDB URI from environment variables
uri = os.getenv("MONGODB_URI")

# Check if the URI is available
if not uri:
    raise ValueError("MONGODB_URI environment variable is not set. Please check your .env file.")
client = MongoClient(uri, server_api=ServerApi('1'))

# Connect to the database and collection
db = client["fridge"]
fridge_items = db["fridge_items"]
favorite_recipes = db["favorite_recipes"]
user_profiles = db["user_profiles"]

class Item(BaseModel):
    name: str
    quantity: int 

# -----------------------------------------------------------------------------
# 1) Configure the FastAPI instance so that docs_url="/" serves the Swagger UI.
#    We also set openapi_url and redoc_url to maintain or omit as desired.
# -----------------------------------------------------------------------------
app = FastAPI(
    docs_url="/",                 # Serve the Swagger docs at the root URL
    openapi_url="/openapi.json",  # Keep the OpenAPI specification accessible
    redoc_url="/redoc"            # Keep or remove ReDoc by setting it to None
)

app.include_router(login.router)

# Load secret key and algorithm from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (change this later for security)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def unpack_item(item: dict) -> FridgeItem:
    """
    Convert a raw MongoDB document into a FridgeItem Pydantic model.

    This function helps ensure that our data is typed properly when 
    returning items from the database.
    """
    # Construct a FridgeItem model from the MongoDB document
    return FridgeItem(
        id=str(item["_id"]),
        name=item["name"],
        quantity=item["quantity"]
    )

# Test MongoDB connection
try:
    client.admin.command("ping")  # Attempt to ping the database
    print("Pinged your deployment. Successfully connected to MongoDB!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# -----------------------------------------------------------------------------
# 2) Remove or rename the existing root endpoint to avoid conflicts.
#    If you want a 'root' endpoint, rename it for example to @app.get("/welcome").
# -----------------------------------------------------------------------------
@app.get("/welcome", response_model=OpeningPageResponse)
def opening_page():
    """
    Replaces the old root endpoint.
    Returns a welcome message at /welcome instead of /.
    """
    return OpeningPageResponse(Message="Welcome to the fridge app!")

@app.get("/fridge/get", response_model=list[FridgeItem])
def get_items(user_id: str = Depends(get_current_user)):
    """
    Retrieve all items in the fridge. Each item is represented 
    by the FridgeItem model.
    """
    items_cursor = fridge_items.find()  # Query all items from the DB
    # Query only the item correcponding to the user_id
    items_cursor = fridge_items.find({"user_id": user_id}) 
    # Convert each MongoDB document into a FridgeItem using unpack_item
    return [unpack_item(item) for item in items_cursor]

@app.post("/fridge/add", response_model=AddItemResponse)
def add_item(item: Item, user_id: str = Depends(get_current_user)):
    """
    Add an item to the fridge for the current user.
    """
    # Upsert the item using both user_id and name.
    fridge_items.update_one(
        {"user_id": user_id, "name": item.name},
        {"$inc": {"quantity": item.quantity}},
        upsert=True
    )
    print(f"Authenticated user: {user_id}")
    all_items_fridge = get_items(user_id)
    return AddItemResponse(
        message=f"{item.quantity} {item.name}(s) added to the fridge.",
        all_items=all_items_fridge
    )

@app.delete("/fridge/remove", response_model=RemoveItemResponse)
def remove_item(item: Item, user_id: str = Depends(get_current_user)):
    """
    Remove an item from the fridge for the current user.
    """
    existing_item = fridge_items.find_one({"user_id": user_id, "name": item.name})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found in the fridge.")

    if item.quantity == 1000000000:  # Remove the entire item
        fridge_items.delete_one({"user_id": user_id, "name": item.name})
        message = f"{item.name} completely removed."
    else:
        if existing_item["quantity"] < item.quantity:
            raise HTTPException(status_code=400, detail="Not enough items in the fridge.")
        new_quantity = existing_item["quantity"] - item.quantity
        if new_quantity > 0:
            fridge_items.update_one(
                {"user_id": user_id, "name": item.name},
                {"$set": {"quantity": new_quantity}}
            )
            message = f"Decremented {item.name} by {item.quantity}."
        else:
            fridge_items.delete_one({"user_id": user_id, "name": item.name})
            message = f"{item.name} removed."

    return RemoveItemResponse(
        message=message,
        all_items=get_items(user_id)
    )

@app.put("/fridge/update_quantity", response_model=UpdateItemResponse)
def update_quantity(item: Item, user_id: str = Depends(get_current_user)):
    """
    Update the quantity of an item in the fridge for the current user.
    """
    existing_item = fridge_items.find_one({"user_id": user_id, "name": item.name})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found in the fridge.")

    if item.quantity <= 0:
        fridge_items.delete_one({"user_id": user_id, "name": item.name})
        message = f"{item.name} removed from the fridge."
    else:
        fridge_items.update_one(
            {"user_id": user_id, "name": item.name},
            {"$set": {"quantity": item.quantity}}
        )
        message = f"{item.name} quantity updated to {item.quantity}."

    return UpdateItemResponse(
        message=message,
        all_items=get_items(user_id)
    )

@app.get("/fridge/suggestions", response_model=GenerateSuggestionsResponse)
def generate_suggestions(user_id: str = Depends(get_current_user)):
    """
    Generate item-based suggestions based on what is currently in the fridge. 
    Response is enforced by GenerateSuggestionsResponse.
    
    If the fridge is empty, raises a 400 error.
    """
    items_cursor = fridge_items.find({"user_id": user_id})
    item_names = [doc["name"] for doc in items_cursor]

    if not item_names:
        raise HTTPException(status_code=400, detail="The fridge is empty!")

    # Generate simple suggestions for each item
    suggestions = [
        f"How about making something with {name}?" for name in item_names
    ]

    return GenerateSuggestionsResponse(suggestions=suggestions)

@app.post("/fridge/generate_recipes", response_model=GenerateRecipesResponse)
def generate_recipes(preferences: RecipePreferences, user_id: str = Depends(get_current_user)):
    """
    Generate three recipe suggestions based on current fridge contents and user preferences 
    using an ML function. Response is enforced by GenerateRecipesResponse, returning structured JSON.
    
    Raises a 400 error if the fridge is empty, or a 500 error if recipe generation fails.
    """
    # Get all items from the fridge as (name, quantity) tuples
    items_cursor = fridge_items.find({"user_id": user_id})
    fridge_contents = [(doc["name"], doc["quantity"]) for doc in items_cursor]

    if not fridge_contents:
        raise HTTPException(
            status_code=400, 
            detail="The fridge is empty! Please add some ingredients first."
        )
    try:
        # Convert preferences from Pydantic model to dict
        preferences_dict = preferences.dict() if preferences else {}
        
        # Pass both fridge contents and preferences to the recipe generator
        recipes_dict = generate_delicious_recipes(fridge_contents, preferences_dict)
        return recipes_dict
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating recipes: {str(e)}"
        )

@app.get("/fridge/generate_recipes", response_model=GenerateRecipesResponse)
def generate_recipes_get(user_id: str = Depends(get_current_user)):
    """
    Legacy GET endpoint for backward compatibility.
    Generate three recipe suggestions based on current fridge contents using an ML function.
    This endpoint doesn't accept preferences and is maintained for backward compatibility.
    """
    # Create empty preferences
    empty_preferences = RecipePreferences()
    # Call the POST version with empty preferences
    return generate_recipes(empty_preferences, user_id)

@app.post("/fridge/load_from_image", response_model=ImageRecipeResponse)
async def convert_image_to_recipes(image_file: UploadFile = File(...)):
    """
    Accepts an image file in the request body (JPEG, PNG, etc.) and uses the ML function
    to convert it into structured recipe information.

    Returns a JSON response with a list of ingredients detected in the image.
    """
    # --- Step 1: Validate the input file and its format --- #
    if not image_file:
        raise HTTPException(status_code=400, detail="No image file provided.")
    
    # Check if the file has a valid image extension
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'}
    file_ext = os.path.splitext(image_file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Supported formats: {', '.join(allowed_extensions)}"
        )
    
    # Check content type (MIME type) for additional validation
    content_type = image_file.content_type
    if not content_type or not content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file does not appear to be an image."
        )

    # --- Step 2: Read the file contents --- #
    try:
        file_bytes = await image_file.read()  # Read the uploaded file as bytes
        
        # Ensure we have actual image data
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty image file provided.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading uploaded file: {str(e)}")

    # --- Step 3: Call the ML function to extract recipe info --- #
    try:
        # The extract_recipe_from_image function now returns a dictionary with an ingredients list
        ingredients_dict = extract_recipe_from_image(file_bytes)
        return ingredients_dict
    except ValueError as e:
        # For known validation errors, raise a 400
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # General fallback for unexpected errors
        raise HTTPException(status_code=500, detail=f"Error extracting recipes from image: {str(e)}")


    # --- Step 4: Return the result in the ImageRecipeResponse model --- #
    return ImageRecipeResponse(recipes=recipes_from_image)


@app.get("/fridge/get_favorite_recipes")
def get_favorite_recipes(user_id: str = Depends(get_current_user)):
    """
    Retrieve all favorite recipes for the current user.
    """
    favorite_recipes_cursor = favorite_recipes.find({"user_id": user_id})
    favorite_recipes_list = [
        {
            "id": str(recipe["_id"]),
            "title": recipe["title"],
            "description": recipe.get("description", "")
        }
        for recipe in favorite_recipes_cursor
    ]
    return favorite_recipes_list

@app.post("/recipes/favorite")
def favorite_recipe(recipe: FavoriteRecipe, user_id: str = Depends(get_current_user)):
    """
    Add or remove a recipe from favorites for the current user.
    If `isFavorited` is True, add it; otherwise, remove it.
    """
    if recipe.isFavorited:
        favorite_recipes.update_one(
            {"user_id": user_id, "title": recipe.title},
            {"$set": {"description": recipe.description, "user_id": user_id}},
            upsert=True
        )
        return {"message": f"Added {recipe.title} to favorites"}
    else:
        favorite_recipes.delete_one({"user_id": user_id, "title": recipe.title})
        return {"message": f"Removed {recipe.title} from favorites"}

@app.post("/fridge/remove_favorite_recipe")
def remove_favorite_recipe(recipe: RemoveFavoriteRequest, user_id: str = Depends(get_current_user)):
    """
    Remove a favorite recipe by title for the current user.
    """
    result = favorite_recipes.delete_one({"user_id": user_id, "title": recipe.title})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": f"Removed {recipe.title} from favorites"}

# --- User Profile Endpoints --- #

@app.get("/user/profile", response_model=UserProfile)
def get_user_profile_info(profile_data = Depends(get_user_profile)):
    """
    Get the current user's profile information from the JWT token.
    """
    return UserProfile(
        name=profile_data.get("name"),
        email=profile_data.get("email"),
        picture=profile_data.get("picture")
    )

@app.post("/user/info", response_model=UpdateProfileResponse)
def update_user_info(
    request: UpdateUserInfoRequest,
    profile_data = Depends(get_user_profile)
):
    """
    Update the user's profile information in the database
    """
    user_id = profile_data["user_id"]
    
    try:
        # Get current profile data
        current_profile = user_profiles.find_one({"user_id": user_id})
        
        # Prepare update data, only updating fields that are provided
        update_data = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.email is not None:
            update_data["email"] = request.email
        if request.picture is not None:
            update_data["picture"] = request.picture
            
        # If we have no fields to update, return current profile
        if not update_data:
            # Return current profile if it exists
            if current_profile:
                return UpdateProfileResponse(
                    success=True,
                    message="No changes requested",
                    profile=UserProfile(
                        name=current_profile.get("name"),
                        email=current_profile.get("email"),
                        picture=current_profile.get("picture")
                    )
                )
            else:
                # Create a new profile with data from the token
                update_data = {
                    "name": profile_data.get("name"),
                    "email": profile_data.get("email"),
                    "picture": profile_data.get("picture")
                }
        
        # Update or create the user profile
        result = user_profiles.update_one(
            {"user_id": user_id},
            {"$set": update_data},
            upsert=True
        )
        
        # Get the updated profile
        updated_profile_data = user_profiles.find_one({"user_id": user_id})
        
        # Create response
        updated_profile = UserProfile(
            name=updated_profile_data.get("name"),
            email=updated_profile_data.get("email"),
            picture=updated_profile_data.get("picture")
        )
        
        return UpdateProfileResponse(
            success=True,
            message="Profile updated successfully",
            profile=updated_profile
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating user profile: {str(e)}"
        )

@app.put("/user/update-profile-picture", response_model=UpdateProfileResponse)
def update_profile_picture(
    request: UpdateProfilePictureRequest, 
    profile_data = Depends(get_user_profile)
):
    """
    Update the user's profile picture URL in the database
    """
    user_id = profile_data["user_id"]
    
    try:
        # Update or create the user profile document
        result = user_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                "picture": request.picture_url,
                "name": profile_data.get("name"),
                "email": profile_data.get("email")
            }},
            upsert=True
        )
        
        # Create a UserProfile response object
        updated_profile = UserProfile(
            name=profile_data.get("name"),
            email=profile_data.get("email"),
            picture=request.picture_url
        )
        
        return UpdateProfileResponse(
            success=True,
            message="Profile picture updated successfully",
            profile=updated_profile
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating profile picture: {str(e)}"
        )

@app.get("/user/search", response_model=UserSearchResponse)
def search_users(
    email: str = Query(None, description="Email to search for (partial match)"),
    name: str = Query(None, description="Name to search for (partial match)"),
    current_user_id: str = Depends(get_current_user)
):
    """
    Search for users by email or name.
    Returns a list of matching users with their profile information.
    """
    # Build the query based on provided parameters
    query = {}
    
    if email:
        # Case-insensitive partial match for email
        query["email"] = {"$regex": email, "$options": "i"}
    
    if name:
        # Case-insensitive partial match for name
        query["name"] = {"$regex": name, "$options": "i"}
    
    # If no search parameters provided, return an empty result
    if not query:
        return UserSearchResponse(users=[], count=0)
    
    try:
        # Find matching users
        users_cursor = user_profiles.find(query)
        
        # Convert to list of UserSearchResult objects
        users = []
        for user in users_cursor:
            # Skip the current user in results
            if user.get("user_id") == current_user_id:
                continue
                
            users.append(UserSearchResult(
                user_id=user.get("user_id"),
                name=user.get("name", ""),
                email=user.get("email", ""),
                picture=user.get("picture")
            ))
        
        return UserSearchResponse(
            users=users,
            count=len(users)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error searching for users: {str(e)}"
        )

@app.post("/user/add-friend", response_model=FriendResponse)
def add_friend(request: FriendRequest, current_user_id: str = Depends(get_current_user)):
    """
    Add a friend relationship between the current user and the specified user.
    """
    friend_id = request.friend_id
    
    # Check if the friend exists
    friend = user_profiles.find_one({"user_id": friend_id})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if they're already friends
    current_user = user_profiles.find_one({"user_id": current_user_id})
    if current_user and "friends" in current_user:
        if friend_id in current_user["friends"]:
            return FriendResponse(
                success=True,
                message="Already friends with this user"
            )
    
    try:
        # Add friend to current user's friends list
        user_profiles.update_one(
            {"user_id": current_user_id},
            {"$addToSet": {"friends": friend_id}}
        )
        
        # Add current user to friend's friends list (bidirectional)
        user_profiles.update_one(
            {"user_id": friend_id},
            {"$addToSet": {"friends": current_user_id}}
        )
        
        return FriendResponse(
            success=True,
            message=f"Successfully added {friend.get('name', 'user')} as a friend"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error adding friend: {str(e)}"
        )

@app.get("/user/friends", response_model=FriendsListResponse)
def get_friends(current_user_id: str = Depends(get_current_user)):
    """
    Get the list of friends for the current user.
    """
    try:
        # Get the current user's profile
        current_user = user_profiles.find_one({"user_id": current_user_id})
        
        # If user doesn't exist or has no friends, return empty list
        if not current_user or "friends" not in current_user or not current_user["friends"]:
            return FriendsListResponse(friends=[], count=0)
        
        # Get friend IDs
        friend_ids = current_user["friends"]
        
        # Get friend profiles
        friends_data = []
        for friend_id in friend_ids:
            friend = user_profiles.find_one({"user_id": friend_id})
            if friend:
                friends_data.append(FriendInfo(
                    user_id=friend_id,
                    name=friend.get("name"),
                    email=friend.get("email"),
                    picture=friend.get("picture")
                ))
        
        return FriendsListResponse(
            friends=friends_data,
            count=len(friends_data)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving friends list: {str(e)}"
        )

@app.delete("/user/remove-friend/{friend_id}", response_model=FriendResponse)
def remove_friend(friend_id: str, current_user_id: str = Depends(get_current_user)):
    """
    Remove a friend relationship between the current user and the specified user.
    """
    # Check if the friend exists
    friend = user_profiles.find_one({"user_id": friend_id})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Remove friend from current user's friends list
        result1 = user_profiles.update_one(
            {"user_id": current_user_id},
            {"$pull": {"friends": friend_id}}
        )
        
        # Remove current user from friend's friends list
        result2 = user_profiles.update_one(
            {"user_id": friend_id},
            {"$pull": {"friends": current_user_id}}
        )
        
        # Check if any modifications were made
        if result1.modified_count == 0 and result2.modified_count == 0:
            return FriendResponse(
                success=False,
                message="You are not friends with this user"
            )
        
        return FriendResponse(
            success=True,
            message=f"Successfully removed {friend.get('name', 'user')} from friends"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error removing friend: {str(e)}"
        )

@app.post("/user/upload-profile-picture", response_model=UpdateProfileResponse)
async def upload_profile_picture(
    image_file: UploadFile = File(...),
    profile_data = Depends(get_user_profile)
):
    """
    Upload a profile picture file and store it in the database.
    """
    user_id = profile_data["user_id"]
    
    try:
        # Validate file type
        if not image_file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read the image file
        image_data = await image_file.read()
        
        # Here you would typically:
        # 1. Upload the image to a cloud storage service (like AWS S3, Google Cloud Storage)
        # 2. Get back a public URL for the image
        # For now, we'll use a placeholder URL
        # TODO: Implement actual cloud storage upload
        image_url = f"https://storage.example.com/profiles/{user_id}/{image_file.filename}"
        
        # Update the user profile with the new image URL
        result = user_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                "picture": image_url,
                "name": profile_data.get("name"),
                "email": profile_data.get("email")
            }},
            upsert=True
        )
        
        # Create a UserProfile response object
        updated_profile = UserProfile(
            name=profile_data.get("name"),
            email=profile_data.get("email"),
            picture=image_url
        )
        
        return UpdateProfileResponse(
            success=True,
            message="Profile picture uploaded successfully",
            profile=updated_profile
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading profile picture: {str(e)}"
        )
    

@app.post("/user/complete-tutorial", response_model=UpdateProfileResponse)
def complete_tutorial(profile_data = Depends(get_user_profile)):
    """
    Mark the user's tutorial as complete in the database.
    """
    user_id = profile_data["user_id"]
    
    try:
        # Update the user profile to mark the tutorial as complete
        result = user_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                "tutorial_completed": True,
                "name": profile_data.get("name"),
                "email": profile_data.get("email")
            }},
            upsert=True
        )
        
        # Create a UserProfile response object
        updated_profile = UserProfile(
            name=profile_data.get("name"),
            email=profile_data.get("email"),
            picture=profile_data.get("picture"),
            tutorial_completed=True
        )
        
        return UpdateProfileResponse(
            success=True,
            message="Tutorial marked as complete",
            profile=updated_profile
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error marking tutorial as complete: {str(e)}"
        )

@app.get("/user/tutorial-status", response_model=UpdateProfileResponse)
def get_tutorial_status(profile_data = Depends(get_user_profile)):
    """
    Check if the user's tutorial is marked as complete in the database.
    """
    user_id = profile_data["user_id"]
    
    try:
        # Retrieve the user profile to check tutorial status
        user_profile = user_profiles.find_one({"user_id": user_id})
        
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        tutorial_completed = user_profile.get("tutorial_completed", False)
        
        # Create a UserProfile response object
        updated_profile = UserProfile(
            name=user_profile.get("name"),
            email=user_profile.get("email"),
            picture=user_profile.get("picture"),
            tutorial_completed=tutorial_completed
        )
        
        return UpdateProfileResponse(
            success=True,
            message="Tutorial status retrieved successfully",
            profile=updated_profile
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving tutorial status: {str(e)}"
        )

