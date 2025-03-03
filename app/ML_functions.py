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

def generate_delicious_recipes(ingredients_list):

    """
    This function uses OpenAI's '4o mini model' to generate a list of three 
    delicious recipes based on the user's ingredient list.

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

    # --- Step 3: Construct the user prompt to request recipes --- #
    prompt_text = (
        "You are a recipe creator. The user has the following ingredients in their freezer:\n"
        f"{formatted_ingredients}\n"
        "Propose a list of three delicious recipes that could be made from these ingredients. "
        "It is not mandatory to use all ingredients. For each recipe, give a short name, the ingredients required (should only include ingredients that the user has in their freezer) and a detailed, step by step recipe.\n\n"
        """Here is an example recipe:\n"
"Broccoli Bacon Quiche\n\n"
"Ingredients:\n"
"- 4 strips of bacon, chopped into small pieces\n"
"- 1 medium broccoli head (about 2 cups when chopped)\n"
"- 1/2 cup grated cheddar cheese\n"
"- 1/4 cup grated parmesan cheese\n"
"- 4 large eggs\n"
"- 1 cup heavy cream\n"
"- 1 pre-made pie crust (9-inch)\n"
"- 1/2 teaspoon salt\n"
"- 1/4 teaspoon black pepper\n"
"- 1/8 teaspoon nutmeg\n\n"
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
                            }
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
                            }
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
                            }
                        },
                        "required": ["name", "ingredients", "steps"]

                    }
                },
                "required": ["recipe1", "recipe2", "recipe3"]
            }
        }
    ]

    # --- Step 4: Make the API call to OpenAI with function calling --- #
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

    # --- Step 5: Retrieve and parse the function call from the response --- #
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
                recipe1_name = parsed_args["recipe1"]["name"]
                recipe1_ingredients = parsed_args["recipe1"]["ingredients"]
                recipe1_steps = parsed_args["recipe1"]["steps"]
                recipe2_name = parsed_args["recipe2"]["name"]
                recipe2_ingredients = parsed_args["recipe2"]["ingredients"]
                recipe2_steps = parsed_args["recipe2"]["steps"]
                recipe3_name = parsed_args["recipe3"]["name"]
                recipe3_ingredients = parsed_args["recipe3"]["ingredients"]
                recipe3_steps = parsed_args["recipe3"]["steps"]


                # list_of_recipes = [recipe1_name+'\n'+recipe1_description, recipe2_name+'\n'+recipe2_description, recipe3_name+'\n'+recipe3_description] #USE THIS ONCE FIXED
                recipe_string = recipe1_name+'\n'+recipe1_ingredients+'\n'+recipe1_steps+'\n\n'+recipe2_name+'\n'+recipe2_ingredients+'\n'+recipe2_steps+'\n\n'+recipe3_name+'\n'+recipe3_ingredients+'\n'+recipe3_steps #TEMP FIX
                return recipe_string  # Return the structured data


            except json.JSONDecodeError:
                # If the model messed up, return the raw arguments

                return {"error": "Failed to parse function call arguments", "raw_arguments": arguments_str}
        else:
            print("No function call was used")
            # If no function_call was used, fallback to raw content
            return {"fallback_content": response.choices[0].message.content.strip()}

    except (IndexError, AttributeError) as e:
        raise RuntimeError(f"Unexpected response format from OpenAI API: {e}")


def extract_recipe_from_image(image_data: bytes) -> str:
    """
    This function uses OpenAI's GPT-4o model to generate a list of ingredients with their
    estimated quantities based on the content of an uploaded image.

    Steps:
      1) Validate that the image data is non-empty.
      2) Convert the bytes to a base64-encoded string.
      3) Construct a message prompt that includes both text and the base64-encoded image.
      4) Make the API call to OpenAI with function calling to get structured output.
      5) Parse the output for the ingredients list with quantities.
      6) Return that data as a string for our API response.

    :param image_data: The raw bytes of the uploaded image.
    :return: A string that lists ingredients with quantities detected in the image.
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

                # Format the ingredients with quantities as a numbered list
                if ingredients_list:
                    ingredients_str = "\n".join(
                        f"{idx + 1}) {ingredient['name']} - {ingredient['quantity']}" 
                        for idx, ingredient in enumerate(ingredients_list)
                    )
                    return ingredients_str
                else:
                    return "No ingredients detected in the image."

            except json.JSONDecodeError:
                return {"error": "Failed to parse function call arguments", "raw_arguments": arguments_str}
        else:
            # If no function_call was used, fallback to raw content
            raw_content = response.choices[0].message.content.strip()
            return f"Model did not use function call. Raw output:\n{raw_content}"

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
    print(recipes_output)

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
        print(recipe_info)
    except Exception as e:
        print(f"\nError in image processing: {e}")


# This ensures main() is called only when the file is executed directly.
if __name__ == "__main__":
    main()