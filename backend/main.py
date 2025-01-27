from fastapi import FastAPI, HTTPException
from typing import List
from pydantic import BaseModel

app = FastAPI()

# To be replaced by actual MongoDB
fridge = {}


class Item(BaseModel):
    name: str
    quantity: int

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
