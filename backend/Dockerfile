# Use Python 3.9 as the base image
FROM python:3.9-slim

# Set working directory initially to /app for copying requirements
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Change working directory to /app/backend
WORKDIR /app

# Command to run the application - now works with main:app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 