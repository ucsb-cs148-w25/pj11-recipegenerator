from fastapi import FastAPI

app = FastAPI()

# To run: uvicorn helloworld:app --reload

@app.get("/")
async def root():
    return {"message": "Hello World, from Alexzendor Misra, in the pj11-receipegenerator team"}