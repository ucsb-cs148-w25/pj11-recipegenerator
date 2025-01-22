from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from bson.objectid import ObjectId
from typing import List

# MongoDB connection setup
uri = "mongodb+srv://roseamberwang:IV7mdVRb5m8n6i1a@recipe.djla3.mongodb.net/?retryWrites=true&w=majority&appName=recipe"
client = MongoClient(uri)
db = client['your_database']  # Replace with your database name
collection = db['your_collection']  # Replace with your collection name

# Initialize FastAPI app
app = FastAPI()

# Helper function to serialize MongoDB documents
def serialize_document(document):
    document['_id'] = str(document['_id'])  # Convert ObjectId to string
    return document

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI MongoDB App!"}

@app.get("/items", response_model=List[dict])
async def get_items():
    """Get all items from the collection."""
    items = list(collection.find({}))
    return [serialize_document(item) for item in items]

@app.get("/items/{item_id}")
async def get_item(item_id: str):
    """Get a specific item by ID."""
    item = collection.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_document(item)

@app.post("/items")
async def create_item(item: dict):
    """Create a new item."""
    result = collection.insert_one(item)
    return {"id": str(result.inserted_id)}

@app.delete("/items/{item_id}")
async def delete_item(item_id: str):
    """Delete an item by ID."""
    result = collection.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}
