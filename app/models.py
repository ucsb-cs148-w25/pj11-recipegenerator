"""
This file defines Pydantic models to document and validate the expected inputs 
and outputs for each endpoint in this FastAPI application. By separating these 
models into their own file, we maintain a clear, modular structure that is 
easy to understand and maintain.
"""

from pydantic import BaseModel, Field
from typing import List

class OpeningPageResponse(BaseModel):
    """
    Model for the response returned by the root endpoint '/'.
    This response simply contains a welcome message for the user.
    """
    # A string field representing a human-readable message about the app
    Message: str = Field(..., description="Welcome message from the app.")


class Item(BaseModel):
    """
    Model for the request body used by the add_item and remove_item endpoints.
    This model validates that the user provides a string 'name' and an integer 'quantity'.
    """
    # The user owning this item
    user_id: str = Field(..., description = "user_id")
    # The name of the item to be added or removed
    name: str = Field(..., description="Name of the item.")
    # The quantity of the item to be added or removed
    quantity: int = Field(..., gt=0, description="Quantity of the item (must be greater than 0).")


class FridgeItem(BaseModel):
    """
    Model for an item as stored in the fridge, including the unique identifier
    assigned by MongoDB, the name, and the quantity.
    """
    # A string representing the unique identifier (ObjectId) of the item in the database
    id: str = Field(..., description="Unique identifier for this item.")
    # Added: a string representing the unique identifier of the user using this database.
    user_id: str = Field(..., description = "Unique identifier for user.")
    # The name of the item as stored in the fridge
    name: str = Field(..., description="Name of the item.")
    # The current quantity of the item
    quantity: int = Field(..., description="Quantity of the item in the fridge.")


class AddItemResponse(BaseModel):
    """
    Model for the response returned by the /fridge/add endpoint.
    Contains a message string and a list of all items currently in the fridge.
    """
    # A string containing a short message about the added item
    message: str = Field(..., description="Confirmation message indicating successful item addition.")
    # A list of all items currently in the fridge after the addition
    all_items: List[FridgeItem] = Field(..., description="Complete list of items in the fridge.")


class RemoveItemResponse(BaseModel):
    """
    Model for the response returned by the /fridge/remove endpoint.
    Contains a simple message referencing the item removal result.
    """
    # A string containing a short message about the removed item
    message: str = Field(..., description="Confirmation message indicating successful item removal.")
        # A list of all items currently in the fridge after the remove
    all_items: List[FridgeItem] = Field(..., description="Complete list of items in the fridge.")


class GenerateSuggestionsResponse(BaseModel):
    """
    Model for the response returned by the /fridge/generate endpoint.
    Contains a list of recipe or cooking suggestions, each as a string.
    """
    # A list of suggestions, each as a string
    suggestions: List[str] = Field(..., description="List of cooking suggestions.")


class GenerateRecipesResponse(BaseModel):
    """
    Model for the response returned by the /fridge/recipes endpoint.
    Contains a structured JSON response with recipe details.
    """
    recipe1: dict = Field(..., description="First recipe with name, ingredients, and steps")
    recipe2: dict = Field(..., description="Second recipe with name, ingredients, and steps")
    recipe3: dict = Field(..., description="Third recipe with name, ingredients, and steps")


class ImageRecipeResponse(BaseModel):
    """
    Model for the response returned by the /fridge/load_from_image endpoint.
    Contains a structured list of ingredients detected in the image.
    """
    ingredients: dict = Field(..., description="List of ingredients with quantities detected in the image")


# Remove or comment out the duplicate model definition that's causing conflicts
# class ImageRecipeResponse(BaseModel):
#     """
#     Model for the response returned by the /fridge/image/recipes endpoint.
#     Contains recipe-related information derived from the uploaded image data.
#     """
#     # This field contains the string output of the ML model's recipe extraction from an image
#     recipes: str = Field(..., description="Recipes generated from analyzing the uploaded image.") 