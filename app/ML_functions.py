"""
This file contains functions for generating recipes using OpenAI's '4o mini model'.
It demonstrates how to:
  1) Validate and prepare a list of ingredient tuples as input.
  2) Construct a prompt to request three sample recipes from the model.
  3) Call the OpenAI chat completion API (which uses the `max_completion_tokens` parameter for o1 series models).
  4) Process and return the resulting text.

Note: 'max_tokens' is deprecated for o1 models. We must use 'max_completion_tokens' instead. 
Also note that 'system' roles can be replaced with 'developer' roles according to the updated documentation.
"""

import openai
from openai import OpenAI
import os
from dotenv import load_dotenv


#loading the .env file
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
        # Ensure each item is a tuple.
        if not isinstance(item, tuple):
            raise ValueError("All items in ingredients_list must be tuples.")
        # Check correct tuple length.
        if len(item) != 2:
            raise ValueError("Each tuple must have exactly 2 elements: (ingredient_name, quantity).")
        # Check types within the tuple.
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
        # Initialize the OpenAI client
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


def main():
    """
    Main function to demonstrate usage of generate_delicious_recipes.
    This function:
      1) Defines a sample set of ingredients.
      2) Calls generate_delicious_recipes().
      3) Prints the returned recipes.
    """

    # Define a list of ingredient tuples
    sample_ingredients = [
        ("broccoli", 2),
        ("bacon", 5),
        ("carrot", 3)
    ]

    # Generate recipes based on the sample ingredients
    recipes_output = generate_delicious_recipes(sample_ingredients)

    # Print the three recipe suggestions
    print("Here are three delicious recipe suggestions:\n")
    print(recipes_output)


# This ensures main() is called only when the file is executed directly.
if __name__ == "__main__":
    main()