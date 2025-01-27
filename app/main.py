from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from bson.objectid import ObjectId

# MongoDB URI
uri = "mongodb+srv://andrewzhang0708:UCSBzc20040708@cluster0.rwfaq.mongodb.net/"
client = MongoClient(uri, server_api=ServerApi('1'))

# Connect to the database and collection
db = client["fridge"]
fridge_items = db["fridge_items"]

# FastAPI app
app = FastAPI()

# Pydantic model for items
class Item(BaseModel):
    name: str
    quantity: int

# Function to unpack MongoDB documents
def unpack_item(item):
    return {
        "id": str(item["_id"]),
        "name": item["name"],
        "quantity": item["quantity"],
    }

# Test MongoDB connection
try:
    client.admin.command("ping")
    print("--------------------------Pinged your deployment. Successfully connected to MongoDB!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

@app.get("/")
def opening_page():
    return {"Message": "Welcome to the fridge app!"}

# Get all items in the fridge
@app.get("/fridge")
def get_items():
    items = fridge_items.find()
    return [unpack_item(item) for item in items]

# Add an item to the fridge
@app.post("/fridge/add")
def add_item(item: Item):
    # Update the quantity if the item exists, otherwise insert a new document
    fridge_items.update_one(
        {"name": item.name},
        {"$inc": {"quantity": item.quantity}},
        upsert=True
    )
    return {"message": f"{item.quantity} {item.name}(s) added to the fridge.", }

# Remove an item from the fridge
@app.post("/fridge/remove")
def remove_item(item: Item):
    existing_item = fridge_items.find_one({"name": item.name})
    if not existing_item:
        raise HTTPException(status_code=404, detail="Item not found in the fridge.")
    if existing_item["quantity"] < item.quantity:
        raise HTTPException(status_code=400, detail="Not enough items in the fridge.")
    
    # Decrease the quantity or delete the item if quantity becomes zero
    new_quantity = existing_item["quantity"] - item.quantity
    if new_quantity > 0:
        fridge_items.update_one({"name": item.name}, {"$set": {"quantity": new_quantity}})
    else:
        fridge_items.delete_one({"name": item.name})
    
    return {"message": f"{item.quantity} {item.name}(s) removed from the fridge."}

# Generate item suggestions
@app.get("/fridge/generate")
def generate_suggestions():
    items = fridge_items.find()
    item_names = [item["name"] for item in items]
    if not item_names:
        raise HTTPException(status_code=400, detail="The fridge is empty!")
    suggestions = [f"How about making something with {name}?" for name in item_names]
    return {"suggestions": suggestions}
