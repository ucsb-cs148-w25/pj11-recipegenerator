import jwt
import datetime

# Define a secret key (keep this private in real applications)
SECRET_KEY = "your_secret_key"

# Create a payload (user claims)
payload = {
    "sub": "user_id_123",  # User ID
    "name": "John Doe",
    "iat": datetime.datetime.utcnow(),  # Issued At
    "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)  # Expiry (1 hour from now)
}

# Generate the token using HMAC-SHA256
token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

print("Generated JWT Token:")
print(token)
