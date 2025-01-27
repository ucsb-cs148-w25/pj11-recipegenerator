# Backend

The backend uses FastAPI to handle requests and stores data in MongoDB.

## TODO

Right now, the MongoDB is running on my MongoDB with my ip on the service. We need to figure out how to make everyone able to run it.

Also, there might be leftover data from testing.

Some edge cases in `remove` need to be handled.

### Usage

Get everything into your local folder. CD into the folder "app".

Run `uvicorn main:app --reload` to get the app running. Check [AndrewZhangHelloWorld](../TeamHelloWorld/AndrewZhangHelloWorld/README.md) to see how to make it happen!

All items are stored in json in the form `{"name": "name", "quantity": 1}`.

Use something that sends a request with body (like postman) to get/post data. 

### See

The `see` function returns everything in the fridge in the form `{"id": "id", "name": "orange", "quantity": 1}`.

### Add

The `add` function adds an item to the fridge and returns everything in the fridge.

### Remove

The `remove` function removes an item in the fridge.
