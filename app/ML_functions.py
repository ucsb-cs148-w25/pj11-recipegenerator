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
from dotenv import load_dotenv
import openai
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

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
      4) Make a call to the OpenAI ChatCompletion endpoint 
         (using parameters compatible with o1 models).
      5) Return the model's generated text as the result.

    :param ingredients_list: A list of tuples. Each tuple includes a string 
                            (ingredient name) and an integer (quantity).
    :return: A string containing three recipe suggestions from the OpenAI model.
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

    # --- Step 3: Construct a user prompt to request recipes --- #
    prompt_text = (
        "You are a recipe creator. The user has the following ingredients in their freezer:\n"
        f"{formatted_ingredients}\n"
        "Propose a list of three delicious recipes that could be made from these ingredients. "
        "It is not mandatory to use all ingredients. For each recipe, give a short name and a one-line description. "
        "Return them as a list, for example:\n"
        "1) <Recipe Name>: <Description>\n"
        "2) ...\n"
        "3) ...\n"
    )

    # --- Call the OpenAI API --- #
    try:
        # Initialize the OpenAI client with your API key
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Make the API call using the client
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "developer", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt_text}
            ],
            max_completion_tokens=300,
            temperature=0.7
        )
    except Exception as e:
        raise RuntimeError(f"OpenAI API call failed: {e}")

    # --- Process the response --- #
    try:
        # Extract the first completion's content using the new client response format
        model_output = response.choices[0].message.content.strip()
    except (IndexError, AttributeError) as e:
        raise RuntimeError(f"Unexpected response format from OpenAI API: {e}")

    return model_output


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