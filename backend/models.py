"""
This file defines Pydantic models to document and validate the expected inputs 
and outputs for each endpoint in this FastAPI application. By separating these 
models into their own file, we maintain a clear, modular structure that is 
easy to understand and maintain.
"""

from pydantic import BaseModel, Field
from typing import List

class FavoriteRecipe(BaseModel):
    title: str
    description: str
    isFavorited: bool  # Indicates if the recipe is favorited

class RemoveFavoriteRequest(BaseModel):
    title: str  # Only expecting title when removing
    
class FridgeItem(BaseModel):
    """
    Model for an item as stored in the fridge, including the unique identifier
    assigned by MongoDB, the name, and the quantity.
    """
    id: str = Field(..., description="Unique identifier for this item.")
    name: str = Field(..., description="Name of the item.")
    quantity: int = Field(..., description="Quantity of the item in the fridge.")

class UpdateItemResponse(BaseModel):
    """
    Model for the response returned by the /fridge/update_quantity endpoint.
    Contains a message and a list of all updated items.
    """
    message: str
    all_items: List[FridgeItem]  # Ensuring FridgeItem is properly referenced

class OpeningPageResponse(BaseModel):
    """
    Model for the response returned by the root endpoint '/'.
    This response simply contains a welcome message for the user.
    """
    Message: str = Field(..., description="Welcome message from the app.")

class Item(BaseModel):
    """
    Model for the request body used by the add_item and remove_item endpoints.
    This model validates that the user provides a string 'name' and an integer 'quantity'.
    """
    name: str = Field(..., description="Name of the item.")
    quantity: int = Field(..., gt=0, description="Quantity of the item (must be greater than 0).")

class AddItemResponse(BaseModel):
    """
    Model for the response returned by the /fridge/add endpoint.
    Contains a message string and a list of all items currently in the fridge.
    """
    message: str = Field(..., description="Confirmation message indicating successful item addition.")
    all_items: List[FridgeItem] = Field(..., description="Complete list of items in the fridge.")

class RemoveItemResponse(BaseModel):
    """
    Model for the response returned by the /fridge/remove endpoint.
    Contains a simple message referencing the item removal result.
    """
    message: str = Field(..., description="Confirmation message indicating successful item removal.")
    all_items: List[FridgeItem]  # Ensuring updated fridge list is returned


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


class RecipePreferences(BaseModel):
    """
    Model for user preferences when generating recipes.
    These preferences help customize the recipe recommendations.
    """
    isVegan: bool = Field(False, description="Whether the user prefers vegan recipes")
    isSpicy: bool = Field(False, description="Whether the user prefers spicy recipes")
    cuisines: List[str] = Field([], description="List of preferred cuisines")
    allergens: List[str] = Field([], description="List of allergens to avoid")


class ImageRecipeResponse(BaseModel):
    """
    Model for the response returned by the /fridge/load_from_image endpoint.
    Contains a structured list of ingredients detected in the image.
    """
    ingredients: List[dict] = Field(..., description="List of ingredients with quantities detected in the image")


# Remove or comment out the duplicate model definition that's causing conflicts
# class ImageRecipeResponse(BaseModel):
#     """
#     Model for the response returned by the /fridge/image/recipes endpoint.
#     Contains recipe-related information derived from the uploaded image data.
#     """
#     # This field contains the string output of the ML model's recipe extraction from an image
#     recipes: str = Field(..., description="Recipes generated from analyzing the uploaded image.") 