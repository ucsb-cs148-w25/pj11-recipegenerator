from fastapi import FastAPI, HTTPException
from typing import List
from pydantic import BaseModel
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson import ObjectId
from app.routers import *


uri = "mongodb+srv://roseamberwang:IV7mdVRb5m8n6i1a@recipe.djla3.mongodb.net/?retryWrites=true&w=majority&appName=recipe"

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

app = FastAPI()

class Item(BaseModel):
    name: str
    quantity: int


def unpack_item(item):
    return {
        "id": str(item["_id"]),
        "name": item["name"],
        "quantity": item["quantity"],
    }

# Test the MongoDB connection
try:
    client.admin.command("ping")
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")


# Get all items in the fridge
@app.get("/fridge")
def get_items():
    return fridge

# Add an item to the fridge
@app.post("/fridge/add")
def add_item(item: Item):
    if item.name in fridge:
        fridge[item.name] += item.quantity
    else:
        fridge[item.name] = item.quantity
    return {"message": f"{item.quantity} {item.name}(s) added to the fridge.", "current fridge items": fridge}

# Remove an item from the fridge
@app.post("/fridge/remove")
def remove_item(item: Item):
    if item.name not in fridge:
        raise HTTPException(status_code=404, detail="Item not found in the fridge.")
    if fridge[item.name] < item.quantity:
        raise HTTPException(status_code=400, detail="Not enough items in the fridge.")
    fridge[item.name] -= item.quantity
    if fridge[item.name] == 0:
        del fridge[item.name]
    return {"message": f"{item.quantity} {item.name}(s) removed from the fridge.", "current fridge items": fridge}

# Generate item suggestions (example logic)
@app.post("/fridge/generate")
def generate_suggestions():
    if not fridge:
        raise HTTPException(status_code=400, detail="The fridge is empty!")
    suggestions = [f"How about making something with {item}?" for item in fridge.keys()]
    return {"suggestions": suggestions}
