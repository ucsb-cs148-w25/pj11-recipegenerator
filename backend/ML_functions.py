"""
This file contains functions for generating recipes and for converting images
into recipe information using OpenAI's GPT-4o (or similar) image features.

Below, we show how to:
  1) Validate and prepare a list of ingredient tuples (generate_delicious_recipes).
  2) Construct prompts or logic for calling an AI model (generate_delicious_recipes).
  3) Accept an image input and convert it to recipe information (extract_recipe_from_image)
     by encoding the image data, sending it to the GPT-4o model via the OpenAI client,
     and then parsing the model's output for recipe information.

NOTE:
 - For local images, we convert the raw bytes to a data URL so it can be passed to the GPT-4o endpoint.
 - The GPT-4o image features may require a valid URL. If data URLs are not supported, you might need to 
   upload the file to an accessible storage location and pass that public URL instead.
 - You should set your OPENAI_API_KEY in a .env file, or set it as an environment variable to avoid 
   hardcoding the API key in the code.
"""

import os
import base64
import json
import openai
import requests  # Added import for fetching image from URL
from openai import OpenAI
from dotenv import load_dotenv  # Add this import for loading .env file

# Load environment variables from .env file
load_dotenv()  # This will load all variables from .env into os.environ

def generate_delicious_recipes(ingredients_list, preferences=None):

    """
    This function uses OpenAI's '4o mini model' to generate a list of three 
    delicious recipes based on the user's ingredient list and preferences.

    The function expects a list of tuples with each tuple being of the form:
    (ingredient_name: str, quantity: int).

    Steps:
      1) Validate the input list and each item in it.
      2) Format the ingredients into a comma-separated string.
      3) Construct a user prompt to request recipes.
      4) Make a call to the OpenAI ChatCompletion endpoint, including a 
         function specification so that the model can directly return
         structured data (function calling).
      5) Return the structured JSON from the model's function call.

    :param ingredients_list: A list of tuples. Each tuple includes a string 
                            (ingredient name) and an integer (quantity).
    :param preferences: Optional dictionary containing user preferences for recipes.
                        Can include 'isVegan', 'isSpicy', 'cuisines', and 'allergens'.
    :return: A dictionary containing three recipe objects if function call 
             is successful. Otherwise, a fallback string of the response.
    """

    # --- Step 1: Error checking and validation --- #
    if not isinstance(ingredients_list, list):
        # Make sure we're actually dealing with a list
        raise ValueError("ingredients_list must be a list of tuples.")
    
    for item in ingredients_list:
        # Ensure each item is a tuple
        if not isinstance(item, tuple):
            raise ValueError("All items in ingredients_list must be tuples.")
        # Check correct tuple length
        if len(item) != 2:
            raise ValueError("Each tuple must have exactly 2 elements: (ingredient_name, quantity).")
        # Check types within the tuple
        if not isinstance(item[0], str):
            raise ValueError("The first element of each tuple must be a string (ingredient name).")
        if not isinstance(item[1], int):
            raise ValueError("The second element of each tuple must be an integer (quantity).")

    # --- Step 2: Format the ingredients into a readable string --- #
    formatted_ingredients = ", ".join([
        f"{ingredient} ({quantity})" for ingredient, quantity in ingredients_list
    ])

    # --- Step 3: Format user preferences --- #
    preferences_text = ""
    if preferences:
        if preferences.get('isVegan', False):
            preferences_text += "- User prefers VEGAN recipes only.\n"
        
        if preferences.get('isSpicy', False):
            preferences_text += "- User prefers SPICY recipes.\n"
        
        if preferences.get('cuisines') and len(preferences.get('cuisines')) > 0:
            cuisines_list = ", ".join(preferences.get('cuisines'))
            preferences_text += f"- User prefers these cuisines: {cuisines_list}.\n"
        
        if preferences.get('allergens') and len(preferences.get('allergens')) > 0:
            allergens_list = ", ".join(preferences.get('allergens'))
            preferences_text += f"- User CANNOT have these allergens: {allergens_list}. DO NOT include these in any recipes.\n"

        if preferences.get('cookingTime') and len(preferences.get('cookingTime')) > 0:
            if preferences.get('cookingTime') == 'any':
                preferences_text += "- User prefers recipes that can be made in any amount of time.\n"
            elif preferences.get('cookingTime') == 'quick':
                preferences_text += "- User prefers recipes that can be made in a short amount of time (less than 30 minutes).\n"
            elif preferences.get('cookingTime') == 'medium':
                preferences_text += "- User prefers recipes that can be made in a medium amount of time (about 30-60 minutes).\n"
            elif preferences.get('cookingTime') == 'long':
                preferences_text += "- User have enough time to make recipes that can take a long time to make (more than 60 minutes).\n"

        if preferences.get('difficulty') and len(preferences.get('difficulty')) > 0:
            if preferences.get('difficulty') == 'easy':
                preferences_text += "- User prefers recipes that are easy to make.\n"
            elif preferences.get('difficulty') == 'medium':
                preferences_text += "- User prefers recipes that are medium difficulty to make.\n"
            elif preferences.get('difficulty') == 'hard':
                preferences_text += "- User prefers recipes requiring advanced cooking techniques.\n"
        
        if preferences.get('useOnlyFridgeIngredients', False):
            preferences_text += "- User prefers recipes that only use ingredients available in their fridge.\n"

    # --- Step 4: Construct the user prompt to request recipes --- #
    prompt_text = (
        "You are a recipe creator. The user has the following ingredients in their freezer:\n"
        f"{formatted_ingredients}\n"
    )
    
    # Add user preferences if they exist
    if preferences_text:
        prompt_text += f"\nUSER PREFERENCES (IMPORTANT):\n{preferences_text}\n"
    
    prompt_text += (
        "Propose a list of three delicious recipes that could be made from these ingredients. "
        "It is not mandatory to use all ingredients. For each recipe, give a short name, the ingredients required (should only include ingredients that the user has in their freezer) and a detailed, step by step recipe.\n\n"
        """Here is an example recipe:\n"
"Broccoli Bacon Quiche\n\n"
"Instructions:\n"
"1. Preheat the oven to 375°F (190°C) - 5 minutes\n"
"2. Cook the chopped bacon in a skillet over medium heat until crispy (about 8-10 minutes). Remove with a slotted spoon and drain on paper towels.\n"
"3. Cut the broccoli into small florets and steam until just tender (about 4-5 minutes). Let cool slightly and then roughly chop.\n"
"4. Blind bake the pie crust for 10 minutes until lightly golden.\n"
"5. In a large bowl, whisk together the eggs, heavy cream, salt, pepper, and nutmeg until well combined (about 2 minutes of whisking).\n"
"6. Layer the bacon, chopped broccoli, and both cheeses in the pre-baked pie crust.\n"
"7. Pour the egg mixture over the filling ingredients.\n"
"8. Bake in the preheated oven for 35-40 minutes, until the center is set and the top is golden brown.\n"
"9. Let cool for 10 minutes before slicing and serving.\n\n"
"Ingredients:\n"
"4 strips of bacon, chopped into small pieces,"
"1 medium broccoli head (about 2 cups when chopped),"
"1/2 cup grated cheddar cheese, "
"1/4 cup grated parmesan cheese, "
"4 large eggs, "
"1 cup heavy cream, "
"1 pre-made pie crust (9-inch), "
"1/2 teaspoon salt, "
"1/4 teaspoon black pepper, "
"1/8 teaspoon nutmeg\n\n"
"Please follow this example format with detailed measurements, precise timing for each step, and complete instructions for your three recipe suggestions, but in a function calling format instead."""
    )

    # --- Define the functions parameter for structured JSON --- #
    functions = [
        {
            "name": "create_recipe_list",
            "description": "Return three recipes, each with a short name and step by step recipe",
            "parameters": {
                "type": "object",
                "properties": {
                    "recipe1": {
                        "type": "object",
                        "description": "Information about the first recipe",
                        "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "The short name of the recipe"
                                },
                            "ingredients": {
                                "type": "string",
                                "description": "Detailed list of ingredients required for the recipe"
                            },
                            "steps": {
                                "type": "string",
                                "description": "Detailed, step by step recipe"
                            },
                        },
                        "required": ["name", "ingredients", "steps"]

                    },
                    "recipe2": {
                        "type": "object",
                        "description": "Information about the second recipe",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "The short name of the recipe"
                            },
                            "ingredients": {
                                "type": "string",
                                "description": "Detailed list of ingredients required for the recipe"
                            },
                            "steps": {
                                "type": "string",
                                "description": "Detailed, step by step recipe"
                            },
                        },
                        "required": ["name", "ingredients", "steps"]

                    },
                    "recipe3": {
                        "type": "object",
                        "description": "Information about the third recipe",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "The short name of the recipe"
                            },
                            "ingredients": {
                                "type": "string",
                                "description": "Detailed list of ingredients required for the recipe"
                            },
                            "steps": {
                                "type": "string",
                                "description": "Detailed, step by step recipe"
                            },
                        },
                        "required": ["name", "ingredients", "steps"]

                    }
                },
                "required": ["recipe1", "recipe2", "recipe3"]
            }
        }
    ]

    # --- Step 5: Make the API call to OpenAI with function calling --- #
    try:
        client = OpenAI(base_url="https://api.groq.com/openai/v1",
        api_key=os.getenv("GROQ_API_KEY")
        )  # Initialize the groq client
        response = client.chat.completions.create(
            model="deepseek-r1-distill-llama-70b",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt_text}
            ],
            functions=functions,
            function_call={"name": "create_recipe_list"},  # Let the model create or skip function calls as it sees fit
            max_completion_tokens=4000,
            temperature=0.5

        )
    except Exception as e:
        raise RuntimeError(f"OpenAI API call failed: {e}")

    # --- Step 6: Retrieve and parse the function call from the response --- #
    try:
        # Fetch the role to check if the assistant has called the function
        role = response.choices[0].message.role

        # If the assistant used the function_call approach
        if hasattr(response.choices[0].message, "function_call"):
            function_call_data = response.choices[0].message.function_call
            # The 'name' should be the function we defined, and the arguments are in JSON format
            arguments_str = function_call_data.arguments

            try:
                # Attempt to parse the JSON arguments provided by the model
                parsed_args = json.loads(arguments_str)
                
                # Return the structured data directly as a dictionary matching our response model
                return {
                    "recipe1": {
                        "name": parsed_args["recipe1"]["name"],
                        "ingredients": parsed_args["recipe1"]["ingredients"].split(", "),
                        "steps": parsed_args["recipe1"]["steps"]
                    },
                    "recipe2": {
                        "name": parsed_args["recipe2"]["name"],
                        "ingredients": parsed_args["recipe2"]["ingredients"].split(", "),
                        "steps": parsed_args["recipe2"]["steps"]
                    },
                    "recipe3": {
                        "name": parsed_args["recipe3"]["name"],
                        "ingredients": parsed_args["recipe3"]["ingredients"].split(", "),
                        "steps": parsed_args["recipe3"]["steps"]
                    }
                }

            except json.JSONDecodeError:
                # If the model messed up, return the raw arguments
                return {"error": "Failed to parse function call arguments", "raw_arguments": arguments_str}
        else:
            print("No function call was used")
            # If no function_call was used, fallback to raw content
            return {"fallback_content": response.choices[0].message.content.strip()}

    except (IndexError, AttributeError) as e:
        raise RuntimeError(f"Unexpected response format from OpenAI API: {e}")


def extract_recipe_from_image(image_data: bytes) -> dict:
    """
    This function uses OpenAI's GPT-4o model to generate a list of ingredients with their
    estimated quantities based on the content of an uploaded image.

    Steps:
      1) Validate that the image data is non-empty.
      2) Convert the bytes to a base64-encoded string.
      3) Construct a message prompt that includes both text and the base64-encoded image.
      4) Make the API call to OpenAI with function calling to get structured output.
      5) Parse the output for the ingredients list with quantities.
      6) Return that data as a structured JSON dictionary for our API response.

    :param image_data: The raw bytes of the uploaded image.
    :return: A dictionary containing ingredients with quantities detected in the image.
    """

    # --- Step 1: Basic validation of the image data --- #
    if not image_data:
        raise ValueError("No image data received.")

    # --- Step 2: Convert image bytes to a base64-encoded string --- #
    encoded_image = base64.b64encode(image_data).decode("utf-8")

    # --- Step 3: Define function calling structure for structured JSON output --- #
    functions = [
        {
            "name": "extract_ingredients",
            "description": "Extract a numbered list of food ingredients with estimated quantities visible in the image",
            "parameters": {
                "type": "object",
                "properties": {
                    "ingredients": {
                        "type": "array",
                        "description": "List of ingredients with quantities detected in the image",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Name of the ingredient"
                                },
                                "quantity": {
                                    "type": "string",
                                    "description": "Estimated quantity of the ingredient (e.g., '2 cups', '500g', '3 whole')"
                                }
                            },
                            "required": ["name", "quantity"]
                        }
                    }
                },
                "required": ["ingredients"]
            }
        }
    ]

    # --- Step 4: Make the API call to the GPT-4o vision model with function calling --- #
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Use standard OpenAI client with OpenAI API key

        response = client.chat.completions.create(
            model="gpt-4o",  # Use OpenAI's GPT-4o model with vision capabilities
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "Analyze this image and identify all the food ingredients you can see. For each ingredient, try to estimate the quantity based on what's visible in the image."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{encoded_image}",
                            },
                        },
                    ],
                }
            ],
            functions=functions,
            function_call={"name": "extract_ingredients"},
            max_tokens=1000,
            temperature=0.3
        )
    except Exception as e:
        raise RuntimeError(f"OpenAI API call failed: {e}")

    # --- Step 5: Parse the model output for ingredients with quantities --- #
    try:
        # Check if the model used the function call
        if hasattr(response.choices[0].message, "function_call"):
            function_call_data = response.choices[0].message.function_call
            arguments_str = function_call_data.arguments

            try:
                # Parse the JSON arguments provided by the model
                parsed_args = json.loads(arguments_str)
                ingredients_list = parsed_args.get("ingredients", [])

                # Return the structured data directly as a dictionary matching our response model
                return {
                    "ingredients": ingredients_list  # This already has the right structure with name and quantity keys
                }

            except json.JSONDecodeError:
                return {"error": "Failed to parse function call arguments", "raw_arguments": arguments_str}
        else:
            # If no function_call was used, fallback to raw content
            raw_content = response.choices[0].message.content.strip()
            return {"fallback_content": raw_content}

    except (IndexError, AttributeError) as e:
        raise RuntimeError(f"Unexpected response format from API: {e}")


def main():
    """
    Main function to demonstrate usage of the ML functions above.
    This function:
      1) Defines a sample set of ingredients.
      2) Calls generate_delicious_recipes().
      3) Prints the returned recipes.
      4) Downloads and analyzes a test image to demonstrate the image-based recipe extraction.
    """
    print("Starting demo...")
    # --- Demo for text-based recipe generation --- #
    sample_ingredients = [
        ("broccoli", 2),
        ("bacon", 5),
        ("carrot", 3),
        ("cheese", 1),
        ("egg", 4),
        ("cream", 1),
        ("pie crust", 1),
        ("salt", 1),
        ("pepper", 1)
    ]
    recipes_output = generate_delicious_recipes(sample_ingredients)
    print("Here are three delicious recipe suggestions from text-based function:\n")
    print(json.dumps(recipes_output, indent=4))

    # --- Demo for image-based recipe extraction --- #
    # Download a real test image from URL
    try:
        test_image_url = "https://media.istockphoto.com/id/924476838/photo/delicious-pizza-with-ingredients-and-spices.jpg?s=612x612&w=0&k=20&c=dlj4HvyVhTavzIHyDf7fRVeXB_XDVzhlcdFx7uNi0Gw="
        print(f"\nDownloading test image from: {test_image_url}")
        response = requests.get(test_image_url)
        response.raise_for_status()  # Raise exception if download fails
        
        # Get the image bytes from the response
        test_image_data = response.content
        
        print("Image downloaded successfully, calling extract_recipe_from_image...")
        recipe_info = extract_recipe_from_image(test_image_data)
        print("\nExtracted recipe info from image:\n")
        print(json.dumps(recipe_info, indent=4))
    except Exception as e:
        print(f"\nError in image processing: {e}")


# This ensures main() is called only when the file is executed directly.
if __name__ == "__main__":
    main()