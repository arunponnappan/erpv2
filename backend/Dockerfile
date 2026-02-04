
# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    libzbar0 \
    && rm -rf /var/lib/apt/lists/*
    
# Force Cache Rebuild (Update this date to trigger new install)
ENV CACHE_DATE=2026-01-16-v1

# Copy the requirements file into the container at /app
# Copy the requirements file into the container at /app
COPY requirements_v2.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements_v2.txt

# Copy the rest of the application code
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.py when the container launches
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
