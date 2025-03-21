"""
This file defines the main FastAPI application for the fridge management project.
Here, we integrate the Pydantic models from app/models.py into our endpoints 
to provide strongly typed request/response handling and better documentation.

We also define a new endpoint for handling image uploads and converting them
to recipe information via an ML function in ML_functions.py.

We configure the docs to show at the root URL ("/") by setting docs_url="/".
We also remove or repurpose the existing root endpoint to avoid conflicts.
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Depends
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from fastapi.middleware.cors import CORSMiddleware
from routers import login
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from datetime import datetime

# Import `get_current_user` from `login.py`
from routers.login import get_current_user, get_user_profile


# Import the ML functions
from ML_functions import generate_delicious_recipes, extract_recipe_from_image

# Import the Pydantic models from app/models.py 
from models import (
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
    UpdateProfileResponse
)

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

class Item(BaseModel):
    name: str
    quantity: int 

# Connect to MongoDB collections
favorite_recipes = db["favorite_recipes"]

# Create a new collection for user profiles
user_profiles = db["user_profiles"]

# Connect to MongoDB collections
favorite_recipes = db["favorite_recipes"]

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
    If the user has a stored profile in the database, use that information.
    Otherwise, use the profile information from the JWT token.
    """
    user_id = profile_data["user_id"]
    
    # Try to find the user's profile in the database
    stored_profile = user_profiles.find_one({"user_id": user_id})
    
    if stored_profile:
        # Return profile from database if it exists
        return UserProfile(
            name=stored_profile.get("name", profile_data.get("name")),
            email=stored_profile.get("email", profile_data.get("email")),
            picture=stored_profile.get("picture", profile_data.get("picture"))
        )
    else:
        # Return profile from JWT token if no database profile exists
        return UserProfile(
            name=profile_data.get("name"),
            email=profile_data.get("email"),
            picture=profile_data.get("picture")
        )

@app.post("/user/update-profile-picture", response_model=UpdateProfileResponse)
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
                "email": profile_data.get("email"),
                "updated_at": datetime.now()  # Add a timestamp for when the profile was updated
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

class AddFriendRequest(BaseModel):
    email: str



@app.post("/user/add_friend")
def add_friend(
    request: AddFriendRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Add a friend by email for the current user.
    - 1) Find the friend user profile by email
    - 2) Add that friend's user_id to the current user's 'friends' array
    - 3) Return a JSON object for the newly added friend
    """
    # 1) Find the friend by email
    friend_profile = user_profiles.find_one({"email": request.email})
    if not friend_profile:
        raise HTTPException(status_code=404, detail="Friend not found")

    friend_user_id = friend_profile["user_id"]

    # 2) Add the friend_user_id to the current user's 'friends' list if not already there
    user_profiles.update_one(
        {"user_id": user_id},
        {"$addToSet": {"friends": friend_user_id}}  # addToSet prevents duplicates
    )

    # Optionally, you can also add the current user to the friend's 'friends' list
    # if you want a two-way friendship by default:
    user_profiles.update_one(
        {"user_id": friend_user_id},
        {"$addToSet": {"friends": user_id}}
    )

    # 3) Build a JSON response for the newly added friend
    new_friend_data = {
        "id": friend_user_id,
        "name": friend_profile.get("name", ""),
        "recipes": [],  # You could fetch favorites or leave it empty for now
        "email": friend_profile.get("email", ""),
        "picture": friend_profile.get("picture", "")
    }

    return new_friend_data


@app.delete("/user/remove_friend")
def remove_friend(friend_id: str, user_id: str = Depends(get_current_user)):
    user_profiles.update_one({"user_id": user_id}, {"$pull": {"friends": friend_id}})
    user_profiles.update_one({"user_id": friend_id}, {"$pull": {"friends": user_id}})
    return {"message": "Friend removed"}



@app.get("/user/friend_favorites")
def friend_favorites(friend_id: str, user_id: str = Depends(get_current_user)):
    """
    Return the specified friend's favorite recipes from the database.
    'friend_id' is the user_id of the friend whose favorites we want.
    """
    # Optionally, check if `friend_id` is actually a friend of the current user_id
    # (You can skip this if you want to allow open access for now.)

    # Query the 'favorite_recipes' collection for documents with user_id=friend_id
    friend_favorites_cursor = favorite_recipes.find({"user_id": friend_id})

    # Convert each doc into a simpler JSON structure
    friend_favorites_list = [
        {
            "title": recipe["title"],
            "description": recipe.get("description", "")
        }
        for recipe in friend_favorites_cursor
    ]

    return friend_favorites_list

@app.get("/user/friends")
def get_user_friends(user_id: str = Depends(get_current_user)):
    """
    Return a list of the current user's friends.
    """
    # Get the current user's profile
    user_doc = user_profiles.find_one({"user_id": user_id})
    if not user_doc:
        return []
    
    friend_ids = user_doc.get("friends", [])
    if not friend_ids:
        return []

    # Fetch friend profiles
    friend_docs = user_profiles.find({"user_id": {"$in": friend_ids}})
    friend_list = []
    for doc in friend_docs:
        friend_list.append({
            "id": doc["user_id"],
            "name": doc.get("name", ""),
            "recipes": [],  # Optionally, load their favorites
            "email": doc.get("email", ""),
            "picture": doc.get("picture", "")
        })
    return friend_list
