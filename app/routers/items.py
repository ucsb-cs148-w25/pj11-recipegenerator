from fastapi import APIRouter

# Create a router
router = APIRouter()

# Define routes
@router.get("/items")
async def get_items():
    return {"message": "Get all items"}

@router.post("/items")
async def create_item(item: dict):
    return {"message": "Item created", "item": item}