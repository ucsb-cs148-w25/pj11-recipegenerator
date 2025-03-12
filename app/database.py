from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get MongoDB URI from environment variables
uri = os.getenv("MONGODB_URI")

# Check if the URI is available
if not uri:
    raise ValueError("MONGODB_URI environment variable is not set. Please check your .env file.")

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

# Send a ping to confirm a successful connection
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

# mongodb+srv://andrewzhang0708:UCSBzc20040708@cluster0.rwfaq.mongodb.net/
