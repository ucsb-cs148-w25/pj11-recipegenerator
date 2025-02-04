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
        "It is not mandatory to use all ingredients. For each recipe, give a short name and a detailed, step by step recipe."
    )

    # --- Define the functions parameter for structured JSON --- #
    functions = [
        {
            "name": "create_recipe_list",
            "description": "Return three recipes, each with a short name and one-line description",
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
                            "description": {
                                "type": "string",
                                "description": "Detailed, step by step recipe"
                            }
                        },
                        "required": ["name", "description"]

                    },
                    "recipe2": {
                        "type": "object",
                        "description": "Information about the second recipe",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "The short name of the recipe"
                            },
                            "description": {
                                "type": "string",
                                "description": "Detailed, step by step recipe"
                            }
                        },
                        "required": ["name", "description"]

                    },
                    "recipe3": {
                        "type": "object",
                        "description": "Information about the third recipe",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "The short name of the recipe"
                            },
                            "description": {
                                "type": "string",
                                "description": "Detailed, step by step recipe"
                            }
                        },
                        "required": ["name", "description"]

                    }
                },
                "required": ["recipe1", "recipe2", "recipe3"]
            }
        }
    ]

    # --- Step 4: Make the API call to OpenAI with function calling --- #
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Initialize the OpenAI client
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt_text}
            ],
            functions=functions,
            function_call={"name": "create_recipe_list"},  # Let the model create or skip function calls as it sees fit
            max_completion_tokens=2000,
            temperature=0.7

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
                recipe1_description = parsed_args["recipe1"]["description"]
                recipe2_name = parsed_args["recipe2"]["name"]
                recipe2_description = parsed_args["recipe2"]["description"]
                recipe3_name = parsed_args["recipe3"]["name"]
                recipe3_description = parsed_args["recipe3"]["description"]


                # list_of_recipes = [recipe1_name+'\n'+recipe1_description, recipe2_name+'\n'+recipe2_description, recipe3_name+'\n'+recipe3_description] #USE THIS ONCE FIXED
                recipe_string = recipe1_name+'\n'+recipe1_description+'\n\n'+recipe2_name+'\n'+recipe2_description+'\n\n'+recipe3_name+'\n'+recipe3_description #TEMP FIX
                return recipe_string  # Return the structured data


            except json.JSONDecodeError:
                # If the model messed up, return the raw arguments

                return {"error": "Failed to parse function call arguments", "raw_arguments": arguments_str}
        else:
            # If no function_call was used, fallback to raw content
            return {"fallback_content": response.choices[0].message.content.strip()}

    except (IndexError, AttributeError) as e:
        raise RuntimeError(f"Unexpected response format from OpenAI API: {e}")


def extract_recipe_from_image(image_data: bytes) -> str:
    """
    This function uses the GPT-4o model's image features to generate recipes
    based on the content of an uploaded image.

    Steps:
      1) Validate that the image data is non-empty.
      2) Convert the bytes to a base64-encoded string (rather than creating a data URL).
      3) Construct a message prompt that includes both text and the base64-encoded image.
      4) Make the API call to GPT-4o with the messages array.
      5) Parse the output for the relevant recipe data.
      6) Return that data as a string for our API response.

    :param image_data: The raw bytes of the uploaded image.
    :return: A string that describes recipe suggestions based on the image content.
    """

    # --- Step 1: Basic validation of the image data --- #
    # Here, we just check that the data is non-empty.
    # Additional checks (e.g., verifying file headers) could be implemented as needed.
    if not image_data:
        # Raise an error if no data was found
        raise ValueError("No image data received.")

    # --- Step 2: Convert image bytes to a base64-encoded string --- #
    #    Instead of creating a data URL, we'll directly send the base64 string
    #    in our request to the GPT-4o model.
    encoded_image = base64.b64encode(image_data).decode("utf-8")

    # --- Step 3: Construct the message for GPT-4o model --- #
    #     We'll now pass the base64-encoded image under the "image_base64" key 
    #     instead of "image_url". This means the model receives only base64 data 
    #     without a data URL wrapper.
    request_messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "You are a culinary computer vision expert. Please analyze this image, "
                        "infer possible ingredients or dishes, and return a list of three creative "
                        "recipe suggestions in JSON format as: {\"recipes\": [\"recipe1\", \"recipe2\", \"recipe3\"]}."
                    ),
                },
                {
                    # NOTE: We use "image_base64" instead of "image_url" to comply with 
                    #       the requirement to pass raw base64 data instead of a URL.
                    "type": "image_base64",
                    "image_base64": encoded_image,
                },
            ],
        }
    ]

    # --- Step 4: Make the API call to GPT-4o --- #
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Use the environment variable for the API key.
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=request_messages,
            max_completion_tokens=350,  # Allows enough tokens for a meaningful response
            temperature=0.7             # Controls the 'creativity' of the model's output
        )
    except Exception as e:
        # Catch and raise any exceptions that might occur during the API request
        raise RuntimeError(f"OpenAI GPT-4o image analysis API call failed: {e}")

    # --- Step 5: Parse the model output for recipes --- #
    try:
        # Extract the text response from the API
        model_output = response.choices[0].message.content.strip()

        # Attempt to parse the string as JSON
        parsed = json.loads(model_output)
        # Expecting {"recipes": ["...", "...", "..."]}
        recipes_list = parsed.get("recipes", [])

        # Convert the list of recipes to a formatted string
        # Example:
        # 1) <recipe one>
        # 2) <recipe two>
        # 3) <recipe three>
        if recipes_list:
            recipes_str = "\n".join(
                f"{idx + 1}) {recipe}" for idx, recipe in enumerate(recipes_list)
            )
            return recipes_str
        else:
            # If we have no "recipes" key or it's empty, return the raw output
            return f"Model did not return a 'recipes' field. Full response:\n{model_output}"

    except (json.JSONDecodeError, TypeError) as e:
        # If parsing fails, return the raw output as a fallback
        return f"Could not parse JSON. Raw output:\n{model_output}"


def main():
    """
    Main function to demonstrate usage of the ML functions above.
    This function:
      1) Defines a sample set of ingredients.
      2) Calls generate_delicious_recipes().
      3) Prints the returned recipes.
      4) Demonstrates the placeholder to analyze an example image (for demo).
    """

    # --- Demo for text-based recipe generation --- #
    sample_ingredients = [
        ("broccoli", 2),
        ("bacon", 5),
        ("carrot", 3)
    ]
    recipes_output = generate_delicious_recipes(sample_ingredients)
    print("Here are three delicious recipe suggestions from text-based function:\n")
    print(recipes_output)

    # --- Demo for image-based recipe extraction --- #
    # We'll just simulate some image bytes. In practice, you'd load actual image data.
    test_image_data = b"FakeImageBytesHere"
    try:
        recipe_info = extract_recipe_from_image(test_image_data)
        print("\nExtracted recipe info from image:\n")
        print(recipe_info)
    except Exception as e:
        print(f"\nError extracting recipe from image: {e}")


# This ensures main() is called only when the file is executed directly.
if __name__ == "__main__":
    main()