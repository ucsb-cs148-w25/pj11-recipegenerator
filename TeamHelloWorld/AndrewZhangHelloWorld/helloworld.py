from fastapi import FastAPI

app = FastAPI()

# To run: uvicorn helloworld:app --reload

@app.get("/")
async def root():
    return {"message": "Hello World"}