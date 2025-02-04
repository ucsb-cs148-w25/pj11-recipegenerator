"""
This file defines the main FastAPI application for the fridge management project.
Here, we integrate the Pydantic models from app/models.py into our endpoints 
to provide strongly typed request/response handling and better documentation.

We also define a new endpoint for handling image uploads and converting them
to recipe information via an ML function in ML_functions.py.

We configure the docs to show at the root URL ("/") by setting docs_url="/".
We also remove or repurpose the existing root endpoint to avoid conflicts.
"""

from fastapi import FastAPI, HTTPException, File, UploadFile
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId
from fastapi.middleware.cors import CORSMiddleware

# Import the ML functions
from app.ML_functions import generate_delicious_recipes, extract_recipe_from_image

# Import the Pydantic models from app/models.py 
from app.models import (
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
    RemoveFavoriteRequest
)




# MongoDB URI
# uri = "mongodb+srv://andrewzhang0708:UCSBzc20040708@cluster0.rwfaq.mongodb.net/"
uri = "mongodb+srv://roseamberwang:IV7mdVRb5m8n6i1a@recipe.djla3.mongodb.net/?retryWrites=true&w=majority&appName=recipe"
client = MongoClient(uri, server_api=ServerApi('1'))

# Connect to the database and collection
db = client["fridge"]
fridge_items = db["fridge_items"]

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
def get_items():
    """
    Retrieve all items in the fridge. Each item is represented 
    by the FridgeItem model.
    """
    items_cursor = fridge_items.find()  # Query all items from the DB
    # Convert each MongoDB document into a FridgeItem using unpack_item
    return [unpack_item(item) for item in items_cursor]

@app.post("/fridge/add", response_model=AddItemResponse)
def add_item(item: Item):
    """
    Add an item to the fridge. The request body is validated by Item. 
    Response is enforced by AddItemResponse.
    
    Steps:
      1) If the item already exists, increment its quantity.
      2) Otherwise, create a new document with the given name/quantity.
      3) Retrieve all items afterward and return them in the response.
    """
    # Attempt to increment the quantity if the item name exists. Otherwise upsert a new record.
    fridge_items.update_one(
        {"name": item.name},
        {"$inc": {"quantity": item.quantity}},
        upsert=True
    )
    # Get the updated list of items in the fridge
    all_items_fridge = get_items()  # This will return a list[FridgeItem]
    
    # Return a response that includes a short message and the updated item list
    return AddItemResponse(
        message=f"{item.quantity} {item.name}(s) added to the fridge.",
        all_items=all_items_fridge
    )


@app.post("/fridge/remove", response_model=RemoveItemResponse)
def remove_item(item: Item):
    """
    Remove an item from the fridge.
    """
    existing_item = fridge_items.find_one({"name": item.name})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found in the fridge.")

    if item.quantity == 1000000000:  # Remove entire item
        fridge_items.delete_one({"name": item.name})
        message = f"{item.name} completely removed."
    else:
        if existing_item["quantity"] < item.quantity:
            raise HTTPException(status_code=400, detail="Not enough items in the fridge.")
        new_quantity = existing_item["quantity"] - item.quantity
        if new_quantity > 0:
            fridge_items.update_one({"name": item.name}, {"$set": {"quantity": new_quantity}})
            message = f"Decremented {item.name} by {item.quantity}."
        else:
            fridge_items.delete_one({"name": item.name})
            message = f"{item.name} removed."

    return RemoveItemResponse(
        message=message,
        all_items=get_items()
    )

@app.post("/fridge/update_quantity", response_model=UpdateItemResponse)
def update_quantity(item: Item):
    """
    Update the quantity of an item in the fridge.
    """
    existing_item = fridge_items.find_one({"name": item.name})

    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found in the fridge.")

    if item.quantity <= 0:
        fridge_items.delete_one({"name": item.name})
        message = f"{item.name} removed from the fridge."
    else:
        fridge_items.update_one({"name": item.name}, {"$set": {"quantity": item.quantity}})
        message = f"{item.name} quantity updated to {item.quantity}."

    return UpdateItemResponse(
        message=message,
        all_items=get_items()
    )


@app.get("/fridge/suggestions", response_model=GenerateSuggestionsResponse)
def generate_suggestions():
    """
    Generate item-based suggestions based on what is currently in the fridge. 
    Response is enforced by GenerateSuggestionsResponse.
    
    If the fridge is empty, raises a 400 error.
    """
    items_cursor = fridge_items.find()
    item_names = [doc["name"] for doc in items_cursor]

    if not item_names:
        raise HTTPException(status_code=400, detail="The fridge is empty!")

    # Generate simple suggestions for each item
    suggestions = [
        f"How about making something with {name}?" for name in item_names
    ]

    return GenerateSuggestionsResponse(suggestions=suggestions)

@app.get("/fridge/generate_recipes", response_model=GenerateRecipesResponse)
def generate_recipes():
    """
    Generate three recipe suggestions based on current fridge contents using an ML function.
    Response is enforced by GenerateRecipesResponse.
    
    Raises a 400 error if the fridge is empty, or a 500 error if recipe generation fails.
    """
    # Get all items from the fridge as (name, quantity) tuples
    items_cursor = fridge_items.find()
    fridge_contents = [(doc["name"], doc["quantity"]) for doc in items_cursor]

    if not fridge_contents:
        raise HTTPException(
            status_code=400, 
            detail="The fridge is empty! Please add some ingredients first."
        )
    try:
        recipe_text = generate_delicious_recipes(fridge_contents)
        return GenerateRecipesResponse(recipes=recipe_text)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating recipes: {str(e)}"
        )

@app.post("/fridge/load_from_image", response_model=ImageRecipeResponse)
async def convert_image_to_recipes(image_file: UploadFile = File(...)):
    """
    Accepts an image file in the request body and uses the ML function
    in ML_functions.py to convert it into recipe information.

    Steps:
      1) Receive the uploaded image via UploadFile.
      2) Read the file contents as raw bytes.
      3) Pass the bytes to extract_recipe_from_image().
      4) Return a response containing the model's recipe output.
    """
    # --- Step 1: Validate the input file --- #
    if not image_file:
        # If somehow no file was provided, we raise a 400 error
        raise HTTPException(status_code=400, detail="No image file provided.")

    # --- Step 2: Read the file contents --- #
    try:
        file_bytes = await image_file.read()  # Read the uploaded file as bytes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading uploaded file: {str(e)}")

    # --- Step 3: Call the ML function to extract recipe info --- #
    try:
        recipes_from_image = extract_recipe_from_image(file_bytes)
    except ValueError as e:
        # For known validation errors, raise a 400
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # General fallback for unexpected errors
        raise HTTPException(status_code=500, detail=f"Error extracting recipes from image: {str(e)}")

    # --- Step 4: Return the result in the ImageRecipeResponse model --- #
    # We pass the extracted recipe info into the ImageRecipeResponse model
    return ImageRecipeResponse(recipes=recipes_from_image)



@app.get("/fridge/get_favorite_recipes")
def get_favorite_recipes():
    """
    Retrieve all saved (favorited) recipes.
    """
    favorite_recipes_cursor = favorite_recipes.find()
    favorite_recipes_list = [
        {
            "id": str(recipe["_id"]),
            "title": recipe["title"],
            "description": recipe.get("description", ""),
        }
        for recipe in favorite_recipes_cursor
    ]
    
    return favorite_recipes_list

@app.post("/recipes/favorite")
def favorite_recipe(recipe: FavoriteRecipe):
    """
    Add or remove a recipe from favorites.
    If `isFavorited` is True, add it to favorites.
    If `isFavorited` is False, remove it.
    """
    if recipe.isFavorited:
        favorite_recipes.update_one(
            {"title": recipe.title},
            {"$set": {"description": recipe.description}},
            upsert=True
        )
        return {"message": f"Added {recipe.title} to favorites"}
    else:
        favorite_recipes.delete_one({"title": recipe.title})
        return {"message": f"Removed {recipe.title} from favorites"}



@app.post("/fridge/remove_favorite_recipe")
def remove_favorite_recipe(recipe: RemoveFavoriteRequest):
    """
    Remove a recipe from favorites by title.
    """
    result = favorite_recipes.delete_one({"title": recipe.title})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return {"message": f"Removed {recipe.title} from favorites"}
